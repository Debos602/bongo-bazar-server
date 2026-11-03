/* End-to-end test of the marketplace flow. Stripe network calls are stubbed; webhook
   signatures are real. Run against a disposable local database:  npm run test:e2e  */
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
import 'dotenv/config';

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? '')) {
    console.error('Refusing to run: DATABASE_URL must point at a local test database.');
    process.exit(1);
}

import type { AddressInfo } from 'net';
import app from '../app';
import config from '../config';
import { stripe } from '../helpers/stripe';
import seedSuperAdmin from '../helpers/seed';
import prisma from '../shared/prisma';

let base = '';
let passed = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail?: unknown) => {
    if (ok) passed++;
    else {
        failures.push(name);
        console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
    }
};
const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await fetch(`${base}/api/v1${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    return { status: res.status, json, data: json.data, headers: res.headers };
};
const login = async (email: string, password: string) => {
    const res = await call('POST', '/auth/login', undefined, { email, password });
    const cookie = res.headers.get('set-cookie') ?? '';
    return /accessToken=([^;]+)/.exec(cookie)?.[1] ?? '';
};
const stamp = Date.now();
const register = async (name: string) => {
    const email = `${name}${stamp}@test.local`;
    await call('POST', '/auth/register', undefined, { email, password: 'Passw0rd!', name, phone: '01700000000' });
    return { email, token: await login(email, 'Passw0rd!') };
};
const address = { fullName: 'Rahim', phone: '01700000000', city: 'Dhaka', area: 'Mirpur', address: 'Road 1' };
const signedEvent = (type: string, object: any) => {
    const payload = JSON.stringify({ id: `evt_${Math.random()}`, object: 'event', type, data: { object } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
    return fetch(`${base}/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body: payload });
};

const main = async () => {
    await seedSuperAdmin();
    const server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const refunds: any[] = [];
    const sessions = new Map<string, any>();
    (stripe.checkout.sessions as any).create = async (p: any) => {
        const s = { id: `cs_${p.metadata.orderId}_${sessions.size}`, url: 'https://stripe.test/pay', status: 'open', amount_total: p.line_items[0].price_data.unit_amount };
        sessions.set(s.id, s);
        return s;
    };
    (stripe.checkout.sessions as any).retrieve = async (id: string) => sessions.get(id);
    (stripe.checkout.sessions as any).expire = async (id: string) => { sessions.get(id).status = 'expired'; };
    (stripe.refunds as any).create = async (p: any) => { refunds.push(p); return { id: 're_1' }; };

    const admin = await login(config.superAdminEmail as string, config.superAdminPassword as string);
    check('super admin logs in', !!admin);

    const v1 = await register('vendorone');
    const v2 = await register('vendortwo');
    const c1 = await register('customer');
    const c2 = await register('other');

    // Access control
    check('guest cannot read admin dashboard', (await call('GET', '/dashboard/admin')).status === 401);
    check('customer cannot read admin dashboard', (await call('GET', '/dashboard/admin', c1.token)).status === 403);
    check('customer cannot read vendor dashboard', (await call('GET', '/dashboard/vendor', c1.token)).status === 403);
    check('guest cannot create coupons', (await call('POST', '/coupon', undefined, { code: 'XXXX', discount: 50 })).status === 401);
    check('guest cannot change order status', (await call('PATCH', '/order/1/status', undefined, { status: 'CANCELLED' })).status === 401);
    check('customer cannot delete orders', (await call('DELETE', '/order/1', c1.token)).status === 403);
    check('guest cannot delete cart rows', (await call('DELETE', '/cart/1')).status === 401);
    check('guest cannot create posts', (await call('POST', '/post', undefined, { title: 'a', content: 'b', authorId: 1 })).status === 401);

    // Vendor onboarding
    const appV1 = await call('POST', '/vendor', v1.token, { shopName: 'Dhaka Crafts', description: 'Handmade' });
    const appV2 = await call('POST', '/vendor', v2.token, { shopName: 'Sylhet Tea' });
    check('application is pending', appV1.data?.status === 'PENDING', appV1.json);
    check('duplicate application rejected', (await call('POST', '/vendor', v1.token, { shopName: 'Again' })).status === 409);
    check('pending vendor cannot add products', (await call('POST', '/product', v1.token, { name: 'x', price: 1, image: 'i' })).status === 403);
    check('pending shop is hidden publicly', (await call('GET', `/vendor/${appV1.data.id}`)).status === 404);
    check('customer cannot approve vendors', (await call('PATCH', `/vendor/${appV1.data.id}/status`, c1.token, { status: 'APPROVED' })).status === 403);
    const listed = (await call('GET', `/user?searchTerm=${encodeURIComponent(v1.email)}`, admin)).data?.[0];
    check('users list shows the application', listed?.vendor?.status === 'PENDING' && listed?.role === 'USER', listed);
    check('admin approves', (await call('PATCH', `/vendor/${appV1.data.id}/status`, admin, { status: 'APPROVED' })).data?.status === 'APPROVED');
    check('approval makes the user a vendor', (await call('GET', '/auth/me', v1.token)).data?.role === 'VENDOR');
    check('running shop cannot be rejected', (await call('PATCH', `/vendor/${appV1.data.id}/status`, admin, { status: 'REJECTED' })).status === 400);
    await call('PATCH', `/vendor/${appV2.data.id}/status`, admin, { status: 'APPROVED' });
    check('approved vendor has access with the same token', (await call('GET', '/dashboard/vendor', v1.token)).status === 200);
    check('admin sets commission', (await call('PATCH', `/vendor/${appV2.data.id}/commission`, admin, { commissionRate: 20 })).data?.commissionRate === 20);
    const shop = await call('GET', `/vendor/${appV1.data.id}`);
    check('public shop hides owner contact', shop.status === 200 && !('user' in shop.data), shop.data);

    // Categories and products
    const cat = await call('POST', '/category', admin, { name: `Crafts ${stamp}`, slug: `crafts-${stamp}` });
    check('super admin creates category', cat.status === 201, cat.json);
    const p1 = await call('POST', '/product', v1.token, { name: 'Nakshi Kantha', price: '1000', image: 'https://x/i.jpg', stock: '10', categories: `[${cat.data.id}]`, vendorId: 999, rating: 5, isFeatured: 'true' });
    check('vendor creates product', p1.status === 201, p1.json);
    check('vendorId cannot be spoofed', p1.data.vendorId === appV1.data.id);
    check('rating and featured cannot be self-assigned', p1.data.rating === 0 && p1.data.isFeatured === false);
    const p2 = await call('POST', '/product', v2.token, { name: 'Sylhet Tea Box', price: 500, image: 'https://x/t.jpg', stock: 5 });
    check('other vendor cannot edit it', (await call('PUT', `/product/${p1.data.id}`, v2.token, { price: 1 })).status === 403);
    check('other vendor cannot delete it', (await call('DELETE', `/product/${p1.data.id}`, v2.token)).status === 403);
    check('public filter by vendor works', (await call('GET', `/product?vendorId=${appV1.data.id}`)).data?.length === 1);
    check('public filter by category works', (await call('GET', `/product?category=crafts-${stamp}`)).data?.length === 1);
    check('sort field is whitelisted', (await call('GET', '/product?sortBy=password')).status === 200);
    check('admin features a product', (await call('PATCH', `/product/${p1.data.id}/moderate`, admin, { isFeatured: true })).data?.isFeatured === true);
    await call('PATCH', `/product/${p2.data.id}/moderate`, admin, { isBlocked: true });
    check('blocked product is hidden', (await call('GET', `/product/${p2.data.id}`)).status === 404);
    check('vendor still sees blocked product', (await call('GET', '/product/mine', v2.token)).data?.length === 1);
    await call('PATCH', `/product/${p2.data.id}/moderate`, admin, { isBlocked: false });

    // Cart
    check('cannot add negative quantity', (await call('POST', '/cart', c1.token, { productId: p1.data.id, quantity: -3 })).status === 400);
    check('cannot exceed stock', (await call('POST', '/cart', c1.token, { productId: p2.data.id, quantity: 99 })).status === 400);
    const cartRow = await call('POST', '/cart', c1.token, { productId: p1.data.id, quantity: 2 });
    await call('POST', '/cart', c1.token, { productId: p2.data.id, quantity: 1 });
    check('another customer cannot read cart row', (await call('GET', `/cart/${cartRow.data.id}`, c2.token)).status === 404);
    check('another customer cannot delete cart row', (await call('DELETE', `/cart/${cartRow.data.id}`, c2.token)).status === 404);
    check('cart count', (await call('GET', '/cart/count', c1.token)).data?.totalQuantity === 3);

    // Coupons
    const platformCoupon = `SAVE${stamp}`;
    const vendorCoupon = `SHOP${stamp}`;
    check('admin creates platform coupon', (await call('POST', '/coupon', admin, { code: platformCoupon, discount: 10 })).data?.vendorId === null);
    const vc = await call('POST', '/coupon', v1.token, { code: vendorCoupon, discount: 50, usageLimit: 1 });
    check('vendor coupon is tied to the shop', vc.data?.vendorId === appV1.data.id, vc.json);
    check('vendor cannot edit platform coupons', (await call('GET', '/coupon', v2.token)).data?.length === 0);
    check('coupon preview on cart', (await call('POST', '/coupon/validate', c1.token, { code: platformCoupon })).data?.discount === 250);

    // Multi-vendor order with a platform coupon: subtotal 2500, 10% off = 2250
    const order = await call('POST', '/order/with-address', c1.token, { ...address, couponCode: platformCoupon });
    check('order placed', order.status === 201, order.json);
    check('order total', order.data.total === 2250 && order.data.subtotal === 2500 && order.data.discount === 250, order.data);
    check('split into two vendor parts', order.data.vendorOrders.length === 2);
    const part1 = order.data.vendorOrders.find((p: any) => p.vendorId === appV1.data.id);
    const part2 = order.data.vendorOrders.find((p: any) => p.vendorId === appV2.data.id);
    check('default 10% commission on pre-discount amount', part1.commissionAmount === 200 && part1.vendorEarning === 1800, part1);
    check('custom 20% commission', part2.commissionAmount === 100 && part2.vendorEarning === 400, part2);
    check('stock reduced', (await call('GET', `/product/${p1.data.id}`)).data.stock === 8);
    check('cart emptied', (await call('GET', '/cart', c1.token)).data.length === 0);
    check('cod is the default', order.data.payment.method === 'CASH_ON_DELIVERY');

    // Vendor isolation
    const v1Orders = await call('GET', '/order/vendor', v1.token);
    check('vendor sees only its part', v1Orders.data.length === 1 && v1Orders.data[0].items.length === 1, v1Orders.data);
    check('vendor cannot update another part', (await call('PATCH', `/order/vendor/${part2.id}/status`, v1.token, { status: 'PROCESSING' })).status === 404);
    check('other customer cannot read order', (await call('GET', `/order/${order.data.id}`, c2.token)).status === 404);
    check('cannot skip steps', (await call('PATCH', `/order/vendor/${part1.id}/status`, v1.token, { status: 'DELIVERED' })).status === 400);

    // Fulfilment and status roll-up
    await call('PATCH', `/order/vendor/${part1.id}/status`, v1.token, { status: 'PROCESSING' });
    check('order follows parts', (await call('GET', `/order/${order.data.id}`, c1.token)).data.status === 'PROCESSING');
    check('tracking number saved', (await call('PATCH', `/order/vendor/${part1.id}/status`, v1.token, { status: 'SHIPPED', trackingNumber: 'TRK1' })).data?.trackingNumber === 'TRK1');
    await call('PATCH', `/order/vendor/${part1.id}/status`, v1.token, { status: 'DELIVERED' });
    check('partly delivered stays shipped', (await call('GET', `/order/${order.data.id}`, c1.token)).data.status === 'SHIPPED');
    check('customer cancels the unstarted part', (await call('POST', `/order/${order.data.id}/cancel`, c1.token)).data?.vendorOrders.find((p: any) => p.id === part2.id).status === 'CANCELLED');
    check('cancel restocks', (await call('GET', `/product/${p2.data.id}`)).data.stock === 5);
    const finished = await call('GET', `/order/${order.data.id}`, c1.token);
    check('order delivered once active parts are', finished.data.status === 'DELIVERED');
    check('cod marked paid on delivery', finished.data.payment.status === 'PAID');

    // Reviews
    check('undelivered product cannot be reviewed', (await call('POST', '/review', c1.token, { productId: p2.data.id, rating: 5 })).status === 403);
    check('non-buyer cannot review', (await call('POST', '/review', c2.token, { productId: p1.data.id, rating: 1 })).status === 403);
    const review = await call('POST', '/review', c1.token, { productId: p1.data.id, rating: 4, comment: 'Lovely', userId: 999 });
    check('buyer reviews', review.status === 201 && review.data.userId !== 999, review.json);
    check('second review rejected', (await call('POST', '/review', c1.token, { productId: p1.data.id, rating: 5 })).status === 409);
    const rated = (await call('GET', `/product/${p1.data.id}`)).data;
    check('rating recalculated', rated.rating === 4 && rated.reviewCount === 1, rated);
    check('vendor sees reviews', (await call('GET', '/review/vendor', v1.token)).data.length === 1);

    // Vendor coupon: only that vendor's items, vendor funds it, single use
    await call('POST', '/cart', c1.token, { productId: p1.data.id, quantity: 1 });
    await call('POST', '/cart', c1.token, { productId: p2.data.id, quantity: 1 });
    const vcOrder = await call('POST', '/order/with-address', c1.token, { ...address, couponCode: vendorCoupon });
    const vcPart = vcOrder.data.vendorOrders.find((p: any) => p.vendorId === appV1.data.id);
    check('vendor coupon hits one vendor', vcOrder.data.total === 1000 && vcPart.total === 500, vcOrder.data);
    check('vendor funds its coupon', vcPart.vendorDiscount === 500 && vcPart.commissionAmount === 50 && vcPart.vendorEarning === 450, vcPart);
    await call('POST', '/cart', c1.token, { productId: p1.data.id, quantity: 1 });
    check('usage limit enforced', (await call('POST', '/order/with-address', c1.token, { ...address, couponCode: vendorCoupon })).status === 400);
    const failed = await call('GET', `/product/${p1.data.id}`);
    check('failed order rolls stock back', failed.data.stock === 7, failed.data.stock);
    await call('DELETE', `/cart/${(await call('GET', '/cart', c1.token)).data[0].id}`, c1.token);

    // Overselling
    await call('POST', '/cart', c1.token, { productId: p2.data.id, quantity: 4 });
    await call('POST', '/cart', c2.token, { productId: p2.data.id, quantity: 4 });
    const race = await Promise.all([
        call('POST', '/order/with-address', c1.token, address),
        call('POST', '/order/with-address', c2.token, address),
    ]);
    check('two buyers cannot oversell', race.filter((r) => r.status === 201).length === 1, race.map((r) => r.status));
    check('stock never negative', (await call('GET', `/product/${p2.data.id}`)).data.stock === 0);

    // Stripe
    const addr = await call('POST', '/address', c2.token, address);
    await prisma.product.update({ where: { id: p1.data.id }, data: { stock: 7 } });
    const direct = await call('POST', '/order/direct', c2.token, { addressId: addr.data.id, productId: p1.data.id, quantity: 1 });
    check('buy now works', direct.status === 201, direct.json);
    const foreignAddr = await call('POST', '/order/direct', c1.token, { addressId: addr.data.id, productId: p1.data.id, quantity: 1 });
    check("cannot use someone else's address", foreignAddr.status === 404);
    check('only supported methods', (await call('POST', `/payment/${direct.data.id}`, c2.token, { method: 'BKASH' })).status === 400);
    check("cannot pay someone else's order", (await call('POST', `/payment/${direct.data.id}`, c1.token, { method: 'STRIPE' })).status === 404);
    const pay = await call('POST', `/payment/${direct.data.id}`, c2.token, { method: 'STRIPE' });
    check('checkout url returned', pay.data?.checkoutUrl === 'https://stripe.test/pay', pay.json);
    const part3 = direct.data.vendorOrders[0];
    check('vendor must wait for card payment', (await call('PATCH', `/order/vendor/${part3.id}/status`, v1.token, { status: 'PROCESSING' })).status === 400);
    const bad = await fetch(`${base}/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 'nope' }, body: '{}' });
    check('forged webhook rejected', bad.status === 400);
    const sessionObj = { id: pay.data.payment.stripeSessionId, payment_status: 'paid', payment_intent: 'pi_1' };
    const ok = await signedEvent('checkout.session.completed', sessionObj);
    check('signed webhook accepted', ok.status === 200, await ok.text());
    check('order marked paid', (await call('GET', `/order/${direct.data.id}`, c2.token)).data.payment.status === 'PAID');
    check('vendor can now process', (await call('PATCH', `/order/vendor/${part3.id}/status`, v1.token, { status: 'PROCESSING' })).status === 200);
    check('paid vendor cancel triggers refund', (await call('PATCH', `/order/vendor/${part3.id}/status`, v1.token, { status: 'CANCELLED' })).status === 200);
    check('refund amount is right', refunds.length === 1 && refunds[0].amount === 100000 && refunds[0].payment_intent === 'pi_1', refunds);
    check('payment marked refunded', (await call('GET', `/order/${direct.data.id}`, c2.token)).data.payment.status === 'REFUNDED');

    // Expired session frees stock
    const stockBefore = (await call('GET', `/product/${p1.data.id}`)).data.stock;
    const direct2 = await call('POST', '/order/direct', c2.token, { addressId: addr.data.id, productId: p1.data.id, quantity: 2, paymentMethod: 'STRIPE' });
    const pay2 = await call('POST', `/payment/${direct2.data.id}`, c2.token, { method: 'STRIPE' });
    await signedEvent('checkout.session.expired', { id: pay2.data.payment.stripeSessionId });
    const expired = await call('GET', `/order/${direct2.data.id}`, c2.token);
    check('expired session cancels order', expired.data.status === 'CANCELLED' && expired.data.payment.status === 'FAILED', expired.data);
    check('expired session restocks', (await call('GET', `/product/${p1.data.id}`)).data.stock === stockBefore);

    // Payouts: delivered earnings of 1800
    const bal = await call('GET', '/payout/mine', v1.token);
    check('balance counts delivered only', bal.data.balance.available === 1800, bal.data.balance);
    check('cannot overdraw', (await call('POST', '/payout', v1.token, { amount: 1801, method: 'bKash', accountDetails: '017' })).status === 400);
    const racePay = await Promise.all([1, 2].map(() => call('POST', '/payout', v1.token, { amount: 1000, method: 'bKash', accountDetails: '017' })));
    check('two requests cannot spend one balance', racePay.filter((r) => r.status === 201).length === 1, racePay.map((r) => r.status));
    const payoutId = racePay.find((r) => r.status === 201)!.data.id;
    check('vendor cannot approve own payout', (await call('PATCH', `/payout/${payoutId}`, v1.token, { status: 'PAID' })).status === 403);
    check('admin pays out', (await call('PATCH', `/payout/${payoutId}`, admin, { status: 'PAID', transactionRef: 'TX1' })).data?.status === 'PAID');
    check('cannot pay twice', (await call('PATCH', `/payout/${payoutId}`, admin, { status: 'PAID' })).status === 400);
    const after = (await call('GET', '/payout/mine', v1.token)).data.balance;
    check('balance after payout', after.available === 800 && after.totalPaid === 1000, after);

    // Dashboards
    const dashAdmin = (await call('GET', '/dashboard/admin', admin)).data;
    check('admin dashboard', dashAdmin.totals.commissionEarned >= 200 && dashAdmin.monthlySales.length === 12 && dashAdmin.topProducts.length > 0, dashAdmin?.totals);
    const dashVendor = (await call('GET', '/dashboard/vendor', v1.token)).data;
    check('vendor dashboard', dashVendor.balance.available === 800 && dashVendor.totals.reviews === 1 && dashVendor.recentOrders.length > 0, dashVendor?.balance);
    const dashUser = (await call('GET', '/dashboard/user', c1.token)).data;
    check('user dashboard', dashUser.totals.orders >= 2 && dashUser.totals.reviews === 1, dashUser?.totals);

    // Remaining modules
    const wl = await call('POST', '/wishlist', c1.token, { productId: p1.data.id });
    await call('POST', '/wishlist', c1.token, { productId: p1.data.id });
    check('wishlist is private and de-duplicated', (await call('GET', '/wishlist', c1.token)).data.length === 1 && (await call('GET', '/wishlist', c2.token)).data.length === 0);
    check('wishlist delete checks owner', (await call('DELETE', `/wishlist/${wl.data.id}`, c2.token)).status === 404);
    check('wishlist clears only own list', (await call('DELETE', '/wishlist', c2.token)).status === 200 && (await call('GET', '/wishlist', c1.token)).data.length === 1);
    check('wishlist clear', (await call('DELETE', '/wishlist', c1.token)).status === 200 && (await call('GET', '/wishlist', c1.token)).data.length === 0);
    const post = await call('POST', '/post', admin, { title: 'Hello', content: 'World', tags: 'a,b', authorId: 999 });
    check('post author comes from token', post.status === 201 && post.data.authorId !== 999, post.json);
    check('post views count', (await call('GET', `/post/${post.data.id}`)).data.views === 1);
    check('vendor cannot edit admin post', (await call('PUT', `/post/${post.data.id}`, v1.token, { title: 'x' })).status === 403);
    const prof = await call('PATCH', '/user/update-my-profile', c1.token, { name: 'New Name', role: 'SUPER_ADMIN', status: 'BLOCK' });
    check('profile update cannot change role', prof.data?.name === 'New Name' && prof.data?.role === 'USER', prof.json);
    check('no password hash returned', !JSON.stringify(prof.json).includes('password'));
    const usersRes = await call('GET', '/user', admin);
    check('admin lists users', usersRes.data.length > 0);
    const c2Id = usersRes.data.find((u: any) => u.email === c2.email).id;
    check('admin cannot block self path guarded', (await call('PATCH', `/user/${c2Id}/status`, c1.token, { status: 'BLOCK' })).status === 403);
    check('block user', (await call('PATCH', `/user/${c2Id}/status`, admin, { status: 'BLOCK' })).data?.status === 'BLOCK');
    check('blocked user is locked out immediately', (await call('GET', '/cart', c2.token)).status === 403);


    // Notifications
    const unread = async (t: string) => (await call('GET', '/notification/unread-count', t)).data?.unread;
    const adminNotes = (await call('GET', '/notification?limit=50', admin)).data;
    check('admin told about applications and payouts', adminNotes.items.some((n: any) => n.title === 'New seller application') && adminNotes.items.some((n: any) => n.title === 'New payout request'));
    const v1Notes = (await call('GET', '/notification?limit=50', v1.token)).data;
    check('vendor told about approval, orders, reviews, payout', ['is approved', 'New order', 'star review', 'was sent'].every((t) => v1Notes.items.some((n: any) => n.title.includes(t))), v1Notes.items.map((n: any) => n.title));
    const c1Notes = (await call('GET', '/notification?limit=50', c1.token)).data;
    check('customer told about shipping with tracking', c1Notes.items.some((n: any) => n.title.includes('has shipped') && n.body.includes('TRK1')), c1Notes.items.map((n: any) => n.title));
    check('vendor told when customer cancels', (await call('GET', '/notification?limit=50', v2.token)).data.items.some((n: any) => n.body === 'Cancelled by the customer'));
    const firstNote = c1Notes.items[0];
    check("cannot mark someone else's notification", (await call('PATCH', `/notification/${firstNote.id}/read`, v1.token)).status === 404);
    const beforeRead = await unread(c1.token);
    check('mark one read', (await call('PATCH', `/notification/${firstNote.id}/read`, c1.token)).status === 200 && (await unread(c1.token)) === beforeRead - 1);
    await call('PATCH', '/notification/read-all', c1.token);
    check('mark all read', (await unread(c1.token)) === 0);
    check('guest gets no notifications', (await call('GET', '/notification')).status === 401);

    // Stats
    check('periods on dashboards', dashAdmin.periods.today.sales > 0 && dashAdmin.periods.thisMonth.orders > 0 && dashVendor.periods.thisMonth.sales > 0, dashAdmin?.periods);
    check('growth is null with nothing to compare', dashVendor.periods.thisMonth.growthPct === null);

    // Payment edge cases
    await prisma.product.update({ where: { id: p1.data.id }, data: { stock: 20 } });
    await prisma.product.update({ where: { id: p2.data.id }, data: { stock: 20, isPublished: true } });
    const c3 = await register('thirdbuyer');
    const a3 = await call('POST', '/address', c3.token, address);
    const couponX = `ONCE${stamp}`;
    await call('POST', '/coupon', admin, { code: couponX, discount: 10, usageLimit: 1 });
    const o1 = await call('POST', '/order/direct', c3.token, { addressId: a3.data.id, productId: p1.data.id, quantity: 1, couponCode: couponX });
    check('coupon used', (await prisma.coupon.findUnique({ where: { code: couponX } }))?.usedCount === 1, o1.json);
    const s1 = await call('POST', `/payment/${o1.data.id}`, c3.token, { method: 'STRIPE' });
    const s1b = await call('POST', `/payment/${o1.data.id}`, c3.token, { method: 'STRIPE' });
    check('double click reuses the card page', s1.data.payment.stripeSessionId === s1b.data.payment.stripeSessionId);
    await call('POST', `/order/${o1.data.id}/cancel`, c3.token);
    check('cancelled order returns coupon use', (await prisma.coupon.findUnique({ where: { code: couponX } }))?.usedCount === 0);
    refunds.length = 0;
    const late = { id: s1.data.payment.stripeSessionId, payment_status: 'paid', payment_intent: 'pi_late', amount_total: 90000 };
    await signedEvent('checkout.session.completed', late);
    check('paying after cancel is fully refunded', refunds.length === 1 && refunds[0].amount === 90000, refunds);
    check('late payment marked refunded', (await call('GET', `/order/${o1.data.id}`, c3.token)).data.payment.status === 'REFUNDED');
    await signedEvent('checkout.session.completed', late);
    check('repeated webhook does not refund twice', refunds.length === 1, refunds);

    await call('POST', '/cart', c3.token, { productId: p1.data.id, quantity: 1 });
    await call('POST', '/cart', c3.token, { productId: p2.data.id, quantity: 1 });
    const o2 = await call('POST', '/order/with-address', c3.token, address);
    const s2 = await call('POST', `/payment/${o2.data.id}`, c3.token, { method: 'STRIPE' });
    check('card charges full order', sessions.get(s2.data.payment.stripeSessionId).amount_total === 150000, o2.json);
    const part2b = o2.data.vendorOrders.find((p: any) => p.vendorId === appV2.data.id);
    await call('PATCH', `/order/vendor/${part2b.id}/status`, v2.token, { status: 'CANCELLED' });
    const s2b = await call('POST', `/payment/${o2.data.id}`, c3.token, { method: 'STRIPE' });
    check('card page is replaced after a part is cancelled', s2b.data.payment.stripeSessionId !== s2.data.payment.stripeSessionId && sessions.get(s2b.data.payment.stripeSessionId).amount_total === 100000);
    refunds.length = 0;
    await signedEvent('checkout.session.completed', { id: s2.data.payment.stripeSessionId, payment_status: 'paid', payment_intent: 'pi_old', amount_total: 150000 });
    check('old replaced page is ignored', refunds.length === 0);
    await signedEvent('checkout.session.completed', { id: s2b.data.payment.stripeSessionId, payment_status: 'paid', payment_intent: 'pi_ok', amount_total: 100000 });
    check('correct amount: no refund, paid', refunds.length === 0 && (await call('GET', `/order/${o2.data.id}`, c3.token)).data.payment.status === 'PAID');

    const o3 = await call('POST', '/order/direct', c3.token, { addressId: a3.data.id, productId: p2.data.id, quantity: 1 });
    const s3 = await call('POST', `/payment/${o3.data.id}`, c3.token, { method: 'STRIPE' });
    await call('POST', `/payment/${o3.data.id}`, c3.token, { method: 'CASH_ON_DELIVERY' });
    check('switching to cash closes the card page', sessions.get(s3.data.payment.stripeSessionId).status === 'expired');

    // Category list stays light
    const catList = (await call('GET', `/category?limit=100`)).data.find((c: any) => c.slug === `crafts-${stamp}`);
    check('category list has a count', typeof catList?._count?.products === 'number', catList);

    // Suspended vendor: hidden, cannot sell, cannot be bought from
    await call('POST', '/cart', c1.token, { productId: p1.data.id, quantity: 1 });
    await call('PATCH', `/vendor/${appV1.data.id}/status`, admin, { status: 'SUSPENDED', reason: 'Test' });
    check('suspended shop products hidden', (await call('GET', `/product/${p1.data.id}`)).status === 404);
    check('suspended vendor cannot add', (await call('POST', '/product', v1.token, { name: 'y', price: 1, image: 'i' })).status === 403);
    check('cart with suspended shop cannot check out', (await call('POST', '/order/with-address', c1.token, address)).status === 400);

    // Product CRUD
    await prisma.vendor.update({ where: { id: appV2.data.id }, data: { status: 'APPROVED' } });
    check('customer cannot create products', (await call('POST', '/product', c1.token, { name: 'n', price: 1, image: 'i', vendorId: appV2.data.id })).status === 403);
    check('admin must choose a shop', (await call('POST', '/product', admin, { name: 'n', price: 1, image: 'i' })).status === 400);
    check('admin cannot use an unapproved shop', (await call('POST', '/product', admin, { name: 'n', price: 1, image: 'i', vendorId: appV1.data.id })).status === 400);
    const ap = await call('POST', '/product', admin, { name: 'Admin Added', price: 900, oldPrice: 1200, discount: 25, description: 'd', sku: 'S1', badgeType: 'NEW', tags: 'a,b', image: 'https://x/a.jpg', stock: 3, vendorId: appV2.data.id });
    check('admin creates for a shop', ap.status === 201 && ap.data.vendorId === appV2.data.id, ap.json);
    check('owner can read it to edit', (await call('GET', `/product/manage/${ap.data.id}`, v2.token)).status === 200);
    check('another vendor cannot read it to edit', (await prisma.vendor.update({ where: { id: appV1.data.id }, data: { status: 'APPROVED' } }), (await call('GET', `/product/manage/${ap.data.id}`, v1.token)).status === 403));
    await prisma.vendor.update({ where: { id: appV1.data.id }, data: { status: 'SUSPENDED' } });
    const cleared = await call('PUT', `/product/${ap.data.id}`, admin, { name: 'Renamed', oldPrice: '', discount: '', description: '', sku: '', badgeType: '', tags: '' });
    check('admin edits and clears optional fields', cleared.data?.name === 'Renamed' && cleared.data.oldPrice === null && cleared.data.discount === null && cleared.data.description === null && cleared.data.sku === null && cleared.data.badgeType === null && cleared.data.tags.length === 0 && cleared.data.price === 900, cleared.json);
    check('required field cannot be blanked', (await call('PUT', `/product/${ap.data.id}`, v2.token, { name: '' })).status === 400);
    const hid = await call('PUT', `/product/${ap.data.id}`, v2.token, { isPublished: false });
    check('quick unpublish hides it', hid.data?.isPublished === false && (await call('GET', `/product/${ap.data.id}`)).status === 404);
    check('deleted when it has no orders', (await call('DELETE', `/product/${ap.data.id}`, v2.token)).data?.deleted === true && (await call('GET', `/product/manage/${ap.data.id}`, admin)).status === 404);

    // Delete rules
    check('product on orders is unpublished, not deleted', (await call('DELETE', `/product/${p2.data.id}`, admin)).data?.unpublished === true);
    check('active order cannot be deleted', (await call('DELETE', `/order/${vcOrder.data.id}`, admin)).status === 400);
    check('cancelled order can be deleted', (await call('DELETE', `/order/${direct2.data.id}`, admin)).status === 200);
    check('wrong password is 401', (await call('POST', '/auth/login', undefined, { email: c1.email, password: 'wrong' })).status === 401);
    check('me works with bearer token', (await call('GET', '/auth/me', c1.token)).data?.email === c1.email);
    check('logout works', (await call('POST', '/auth/logout')).status === 200);

    console.log(`\n${passed} passed, ${failures.length} failed`);
    if (failures.length) console.log(failures.join('\n'));
    server.close();
    await prisma.$disconnect();
    process.exit(failures.length ? 1 : 0);
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
