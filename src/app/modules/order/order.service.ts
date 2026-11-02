import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import config from '../../../config';
import { stripe } from '../../../helpers/stripe';
import { roundMoney } from '../../../shared/money';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';
import { findUsableCoupon } from '../coupon/coupon.service';
import { publicProductWhere } from '../product/product.service';
import { VendorService } from '../vendor/vendor.service';

type Tx = Prisma.TransactionClient;
type Line = { productId: number; quantity: number; };

const customerInclude = {
    items: { include: { product: { include: { vendor: { select: { id: true, shopName: true, slug: true } } } } } },
    address: true,
    payment: true,
    vendorOrders: { include: { vendor: { select: { id: true, shopName: true, slug: true } } }, orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

const vendorOrderInclude = {
    items: { include: { product: { select: { id: true, name: true, image: true, sku: true } } } },
    order: {
        select: {
            id: true,
            createdAt: true,
            address: true,
            user: { select: { id: true, name: true, phone: true } },
            payment: { select: { method: true, status: true } },
        },
    },
} satisfies Prisma.VendorOrderInclude;

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};

// Splits the checkout into one part per vendor and records who pays for the discount.
const placeOrder = async (
    tx: Tx,
    userId: number,
    addressId: number,
    lines: Line[],
    couponCode?: string,
    paymentMethod: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY
) => {
    const products = await tx.product.findMany({
        where: { id: { in: lines.map((l) => l.productId) }, ...publicProductWhere },
        include: { vendor: true },
    });

    const groups = new Map<number, { vendor: (typeof products)[number]['vendor']; items: (Line & { price: number; })[]; subtotal: number; }>();
    for (const line of lines) {
        const product = products.find((p) => p.id === line.productId);
        if (!product) throw new ApiError(httpStatus.BAD_REQUEST, 'A product in your order is no longer available');

        // Conditional decrement, so two shoppers cannot buy the last unit at once.
        const { count } = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
        });
        if (!count) {
            throw new ApiError(httpStatus.BAD_REQUEST, `"${product.name}" এর stock নেই (available: ${product.stock})`);
        }

        const group = groups.get(product.vendorId) ?? { vendor: product.vendor, items: [], subtotal: 0 };
        group.items.push({ ...line, price: product.price });
        group.subtotal += product.price * line.quantity;
        groups.set(product.vendorId, group);
    }

    const coupon = couponCode ? await findUsableCoupon(tx, couponCode) : null;
    if (coupon?.vendorId && !groups.has(coupon.vendorId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon does not apply to the items in your order');
    }
    if (coupon) {
        const { count } = await tx.coupon.updateMany({
            where: { id: coupon.id, ...(coupon.usageLimit !== null ? { usedCount: { lt: coupon.usageLimit } } : {}) },
            data: { usedCount: { increment: 1 } },
        });
        if (!count) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired coupon');
    }

    const parts = [...groups.entries()].map(([vendorId, group]) => {
        const eligible = coupon && (!coupon.vendorId || coupon.vendorId === vendorId);
        const discount = eligible ? roundMoney((group.subtotal * coupon!.discount) / 100) : 0;
        const vendorDiscount = coupon?.vendorId ? discount : 0;
        const platformDiscount = coupon?.vendorId ? 0 : discount;
        const subtotal = roundMoney(group.subtotal);
        const commissionRate = group.vendor.commissionRate ?? config.platformCommissionRate;
        const earningBase = subtotal - vendorDiscount;
        const commissionAmount = roundMoney((earningBase * commissionRate) / 100);
        return {
            vendorId,
            items: group.items,
            subtotal,
            vendorDiscount,
            platformDiscount,
            total: roundMoney(subtotal - discount),
            commissionRate,
            commissionAmount,
            vendorEarning: roundMoney(earningBase - commissionAmount),
        };
    });

    const subtotal = roundMoney(parts.reduce((s, p) => s + p.subtotal, 0));
    const total = roundMoney(parts.reduce((s, p) => s + p.total, 0));

    const order = await tx.order.create({
        data: {
            userId,
            addressId,
            subtotal,
            discount: roundMoney(subtotal - total),
            total,
            couponCode: coupon?.code,
            payment: { create: { amount: total, method: paymentMethod } },
        },
    });

    for (const { items, ...part } of parts) {
        await tx.vendorOrder.create({
            data: {
                ...part,
                orderId: order.id,
                items: {
                    create: items.map((i) => ({ orderId: order.id, productId: i.productId, quantity: i.quantity, price: i.price })),
                },
            },
        });
    }

    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: customerInclude });
};

// The customer's order status always follows the vendor parts.
const rollUp = async (tx: Tx, orderId: number) => {
    const parts = await tx.vendorOrder.findMany({ where: { orderId }, select: { status: true } });
    const active = parts.map((p) => p.status).filter((s) => s !== 'CANCELLED');

    let status: OrderStatus = 'PENDING';
    if (!active.length) status = 'CANCELLED';
    else if (active.every((s) => s === 'DELIVERED')) status = 'DELIVERED';
    else if (active.some((s) => s === 'SHIPPED' || s === 'DELIVERED')) status = 'SHIPPED';
    else if (active.includes('PROCESSING')) status = 'PROCESSING';

    await tx.order.update({ where: { id: orderId }, data: { status } });

    const payment = await tx.payment.findUnique({ where: { orderId } });
    if (!payment) return;
    if (status === 'DELIVERED' && payment.method === PaymentMethod.CASH_ON_DELIVERY) {
        await tx.payment.update({ where: { orderId }, data: { status: PaymentStatus.PAID } });
    } else if (status === 'CANCELLED' && payment.status === PaymentStatus.PENDING) {
        await tx.payment.update({ where: { orderId }, data: { status: PaymentStatus.FAILED } });
    }
};

const changePartStatus = async (tx: Tx, vendorOrderId: number, next: OrderStatus, trackingNumber?: string) => {
    const part = await tx.vendorOrder.findUnique({
        where: { id: vendorOrderId },
        include: { items: true, order: { include: { payment: true } } },
    });
    if (!part) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');

    if (!TRANSITIONS[part.status].includes(next)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Cannot change an order from ${part.status} to ${next}`);
    }
    const payment = part.order.payment;
    if (next !== 'CANCELLED' && payment?.method === PaymentMethod.STRIPE && payment.status !== PaymentStatus.PAID) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'This order is waiting for card payment');
    }

    if (next === 'CANCELLED') {
        for (const item of part.items) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
    }
    await tx.vendorOrder.update({
        where: { id: vendorOrderId },
        data: { status: next, ...(trackingNumber !== undefined ? { trackingNumber } : {}) },
    });
    await rollUp(tx, part.orderId);

    // Tells the caller what to refund once the transaction has committed.
    const refund = next === 'CANCELLED' && payment?.status === PaymentStatus.PAID && payment.method === PaymentMethod.STRIPE && part.total > 0
        ? { vendorOrderId, orderId: part.orderId, amount: part.total, paymentIntent: payment.transactionId }
        : null;
    return refund;
};

type Refund = NonNullable<Awaited<ReturnType<typeof changePartStatus>>>;

const issueRefunds = async (refunds: Refund[]) => {
    for (const refund of refunds) {
        try {
            if (!refund.paymentIntent) throw new Error('No payment reference on this order');
            await stripe.refunds.create(
                {
                    payment_intent: refund.paymentIntent,
                    amount: Math.round(refund.amount * 100),
                },
                { idempotencyKey: `vendor-order-refund-${refund.vendorOrderId}` }
            );
        } catch (err) {
            console.error('Stripe refund failed', refund, err);
            throw new ApiError(
                httpStatus.BAD_GATEWAY,
                `Order was cancelled, but the refund of ${refund.amount} failed. Issue it manually in Stripe.`
            );
        }
        await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.update({
                where: { orderId: refund.orderId },
                data: { refundedAmount: { increment: refund.amount } },
            });
            if (roundMoney(payment.refundedAmount) >= roundMoney(payment.amount)) {
                await tx.payment.update({ where: { orderId: refund.orderId }, data: { status: PaymentStatus.REFUNDED } });
            }
        });
    }
};

const cancelParts = async (orderId: number, statuses: OrderStatus[]) => {
    const refunds = await prisma.$transaction(async (tx) => {
        const parts = await tx.vendorOrder.findMany({ where: { orderId, status: { in: statuses } } });
        if (!parts.length) throw new ApiError(httpStatus.BAD_REQUEST, 'This order can no longer be cancelled');
        const collected: Refund[] = [];
        for (const part of parts) {
            const refund = await changePartStatus(tx, part.id, 'CANCELLED');
            if (refund) collected.push(refund);
        }
        return collected;
    });
    await issueRefunds(refunds);
};

const page = (options: { page?: unknown; limit?: unknown; }) => {
    const p = Number(options.page) || 1;
    const limit = Math.min(Number(options.limit) || 10, 100);
    return { page: p, limit, skip: (p - 1) * limit };
};
const validStatus = (s: unknown) => Object.values(OrderStatus).find((v) => v === s);

export const OrderService = {
    createWithAddress: async (
        userId: number,
        addressData: { fullName: string; phone: string; city: string; area: string; address: string; postalCode?: string | null; },
        couponCode?: string,
        paymentMethod?: PaymentMethod
    ) => prisma.$transaction(async (tx) => {
        const cartItems = await tx.cart.findMany({ where: { userId } });
        if (!cartItems.length) throw new ApiError(httpStatus.BAD_REQUEST, 'Cart is empty');

        const address = await tx.address.create({ data: { ...addressData, userId } });
        const order = await placeOrder(
            tx, userId, address.id,
            cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            couponCode, paymentMethod
        );
        await tx.cart.deleteMany({ where: { userId } });
        return order;
    }, { maxWait: 10000, timeout: 30000 }),

    createDirect: async (
        userId: number, addressId: number, productId: number, quantity: number,
        couponCode?: string, paymentMethod?: PaymentMethod
    ) => prisma.$transaction(async (tx) => {
        const address = await tx.address.findFirst({ where: { id: addressId, userId } });
        if (!address) throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
        return placeOrder(tx, userId, addressId, [{ productId, quantity }], couponCode, paymentMethod);
    }, { maxWait: 10000, timeout: 30000 }),

    list: async (userId: number) => prisma.order.findMany({
        where: { userId },
        include: customerInclude,
        orderBy: { createdAt: 'desc' },
    }),

    getOne: async (id: number, userId: number) => {
        const order = await prisma.order.findFirst({ where: { id, userId }, include: customerInclude });
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        return order;
    },

    // A customer may cancel the parts no vendor has started on.
    cancelMine: async (id: number, userId: number) => {
        const order = await prisma.order.findFirst({ where: { id, userId } });
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        await cancelParts(id, ['PENDING']);
        return prisma.order.findUniqueOrThrow({ where: { id }, include: customerInclude });
    },

    vendorList: async (userId: number, query: any) => {
        const vendor = await VendorService.getByUserId(userId);
        const { page: p, limit, skip } = page(query);
        const status = validStatus(query.status);
        const where: Prisma.VendorOrderWhereInput = { vendorId: vendor.id, ...(status ? { status } : {}) };
        const [data, total] = await Promise.all([
            prisma.vendorOrder.findMany({ where, skip, take: limit, include: vendorOrderInclude, orderBy: { createdAt: 'desc' } }),
            prisma.vendorOrder.count({ where }),
        ]);
        return { meta: { page: p, limit, total }, data };
    },

    vendorUpdateStatus: async (id: number, userId: number, status: OrderStatus, trackingNumber?: string) => {
        const vendor = await VendorService.getApprovedByUserId(userId);
        const part = await prisma.vendorOrder.findFirst({ where: { id, vendorId: vendor.id } });
        if (!part) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        const refund = await prisma.$transaction((tx) => changePartStatus(tx, id, status, trackingNumber));
        if (refund) await issueRefunds([refund]);
        return prisma.vendorOrder.findUniqueOrThrow({ where: { id }, include: vendorOrderInclude });
    },

    adminList: async (query: any) => {
        const { page: p, limit, skip } = page(query);
        const status = validStatus(query.status);
        const where: Prisma.OrderWhereInput = status ? { status } : {};
        const [data, total] = await Promise.all([
            prisma.order.findMany({
                where, skip, take: limit, orderBy: { createdAt: 'desc' },
                include: { ...customerInclude, user: { select: { id: true, name: true, email: true, phone: true } } },
            }),
            prisma.order.count({ where }),
        ]);
        return { meta: { page: p, limit, total }, data };
    },

    adminGetOne: async (id: number) => {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { ...customerInclude, user: { select: { id: true, name: true, email: true, phone: true } } },
        });
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        return order;
    },

    // Admin override: moves every vendor part that can make this move.
    updateStatus: async (id: number, status: OrderStatus) => {
        const refunds = await prisma.$transaction(async (tx) => {
            const parts = await tx.vendorOrder.findMany({ where: { orderId: id } });
            const movable = parts.filter((p) => TRANSITIONS[p.status].includes(status));
            if (!movable.length) throw new ApiError(httpStatus.BAD_REQUEST, `No part of this order can change to ${status}`);
            const collected: Refund[] = [];
            for (const part of movable) {
                const refund = await changePartStatus(tx, part.id, status);
                if (refund) collected.push(refund);
            }
            return collected;
        });
        await issueRefunds(refunds);
        return OrderService.adminGetOne(id);
    },

    // Internal: called when an unpaid Stripe session expires.
    cancelUnpaid: async (orderId: number) => {
        await cancelParts(orderId, ['PENDING', 'PROCESSING']);
    },

    remove: async (id: number) => {
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        if (order.status !== 'CANCELLED') throw new ApiError(httpStatus.BAD_REQUEST, 'Only cancelled orders can be deleted');
        await prisma.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({ where: { orderId: id } });
            await tx.vendorOrder.deleteMany({ where: { orderId: id } });
            await tx.payment.deleteMany({ where: { orderId: id } });
            await tx.order.delete({ where: { id } });
        });
    },
};
