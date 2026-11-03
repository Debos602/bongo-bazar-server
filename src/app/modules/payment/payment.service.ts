import { PaymentMethod, PaymentStatus } from '@prisma/client';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import config from '../../../config';
import { stripe } from '../../../helpers/stripe';
import { roundMoney } from '../../../shared/money';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';
import { notify } from '../notification/notification.service';
import { OrderService } from '../order/order.service';

const cents = (amount: number) => Math.round(amount * 100);

// What the customer owes now: cancelled vendor parts no longer count.
const payableAmount = async (orderId: number) => {
    const sum = await prisma.vendorOrder.aggregate({
        where: { orderId, status: { not: 'CANCELLED' } },
        _sum: { total: true },
    });
    return roundMoney(sum._sum.total ?? 0);
};

const expireSession = async (sessionId: string) => {
    try {
        await stripe.checkout.sessions.expire(sessionId);
    } catch (err) {
        console.error('Could not expire Stripe session', sessionId, err);
    }
};

export const PaymentService = {
    // Sets how the customer will pay. Card payment returns a Stripe Checkout URL.
    choose: async (orderId: number, userId: number, method: PaymentMethod) => {
        const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payment: true } });
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        if (order.status === 'CANCELLED') throw new ApiError(httpStatus.BAD_REQUEST, 'This order is cancelled');
        if (order.payment?.status === PaymentStatus.PAID) throw new ApiError(httpStatus.BAD_REQUEST, 'This order is already paid');

        const openSessionId = order.payment?.stripeSessionId;

        if (method === PaymentMethod.CASH_ON_DELIVERY) {
            // Close any open card page, so nobody can pay for an order now marked as cash.
            if (openSessionId) await expireSession(openSessionId);
            const payment = await prisma.payment.upsert({
                where: { orderId },
                update: { method, stripeSessionId: null },
                create: { orderId, amount: order.total, method },
            });
            return { payment, checkoutUrl: null };
        }

        const amount = await payableAmount(orderId);

        // A double click or a return visit reuses the open page instead of opening a second one.
        if (openSessionId) {
            const existing = await stripe.checkout.sessions.retrieve(openSessionId).catch(() => null);
            if (existing?.status === 'open') {
                if (existing.amount_total === cents(amount)) {
                    const payment = await prisma.payment.update({ where: { orderId }, data: { method } });
                    return { payment, checkoutUrl: existing.url };
                }
                await expireSession(openSessionId); // part of the order was cancelled since
            }
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            client_reference_id: String(orderId),
            metadata: { orderId: String(orderId) },
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: config.stripeCurrency,
                    unit_amount: cents(amount),
                    product_data: { name: `Bongo Bazar order #${orderId}` },
                },
            }],
            success_url: `${config.frontendUrl}/dashboard/user/orders?payment=success`,
            cancel_url: `${config.frontendUrl}/dashboard/user/orders?payment=cancelled`,
        });

        const payment = await prisma.payment.upsert({
            where: { orderId },
            update: { method, stripeSessionId: session.id },
            create: { orderId, amount: order.total, method, stripeSessionId: session.id },
        });
        return { payment, checkoutUrl: session.url };
    },

    handleWebhook: async (rawBody: Buffer, signature: string) => {
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret as string);
        } catch {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Stripe signature');
        }

        if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') return;

        const session = event.data.object as Stripe.Checkout.Session;
        const payment = await prisma.payment.findFirst({
            where: { stripeSessionId: session.id },
            include: { order: { select: { id: true, userId: true } } },
        });
        if (!payment) return; // replaced by a newer session

        if (event.type === 'checkout.session.expired') {
            if (payment.status === PaymentStatus.PENDING) await OrderService.cancelUnpaid(payment.orderId);
            return;
        }

        if (session.payment_status !== 'paid') return;
        if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.FAILED) return; // already handled

        // Anything cancelled while the card page was open must go back to the customer.
        const paid = roundMoney((session.amount_total ?? cents(payment.amount)) / 100);
        const owed = await payableAmount(payment.orderId);
        const refund = roundMoney(paid - owed);
        if (refund > 0) {
            // Refund first; if this throws, Stripe retries the webhook and the key prevents a double refund.
            await stripe.refunds.create(
                { payment_intent: String(session.payment_intent), amount: cents(refund) },
                { idempotencyKey: `late-cancel-${session.id}` }
            );
        }

        await prisma.$transaction(async (tx) => {
            const { count } = await tx.payment.updateMany({
                where: { id: payment.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } },
                data: {
                    status: owed > 0 ? PaymentStatus.PAID : PaymentStatus.REFUNDED,
                    transactionId: String(session.payment_intent),
                    refundedAmount: refund > 0 ? refund : 0,
                },
            });
            if (!count) return;

            if (refund > 0) {
                await notify(tx, {
                    userId: payment.order.userId,
                    title: `Refund for order #${payment.orderId}`,
                    body: `৳ ${refund} is being returned to your card because part or all of the order was cancelled.`,
                    link: '/dashboard/user/orders',
                });
            }
            if (owed > 0) {
                const parts = await tx.vendorOrder.findMany({
                    where: { orderId: payment.orderId, status: { not: 'CANCELLED' } },
                    select: { vendor: { select: { userId: true } } },
                });
                await notify(tx, parts.map((p) => ({
                    userId: p.vendor.userId,
                    title: `Order #${payment.orderId} is paid`,
                    body: 'You can start processing it.',
                    link: '/dashboard/vendor/orders',
                })));
            }
        }, { maxWait: 10000, timeout: 30000 });
    },
};
