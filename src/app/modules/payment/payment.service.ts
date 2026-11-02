import { PaymentMethod, PaymentStatus } from '@prisma/client';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import config from '../../../config';
import { stripe } from '../../../helpers/stripe';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';
import { OrderService } from '../order/order.service';

export const PaymentService = {
    // Sets how the customer will pay. Card payment returns a Stripe Checkout URL.
    choose: async (orderId: number, userId: number, method: PaymentMethod) => {
        const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payment: true } });
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        if (order.status === 'CANCELLED') throw new ApiError(httpStatus.BAD_REQUEST, 'This order is cancelled');
        if (order.payment?.status === PaymentStatus.PAID) throw new ApiError(httpStatus.BAD_REQUEST, 'This order is already paid');

        if (method === PaymentMethod.CASH_ON_DELIVERY) {
            const payment = await prisma.payment.upsert({
                where: { orderId },
                update: { method, stripeSessionId: null },
                create: { orderId, amount: order.total, method },
            });
            return { payment, checkoutUrl: null };
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            client_reference_id: String(orderId),
            metadata: { orderId: String(orderId) },
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: config.stripeCurrency,
                    unit_amount: Math.round(order.total * 100),
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
        const payment = await prisma.payment.findFirst({ where: { stripeSessionId: session.id } });
        if (!payment || payment.status !== PaymentStatus.PENDING) return; // already handled, or replaced by a newer session

        if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: PaymentStatus.PAID, transactionId: String(session.payment_intent) },
            });
        } else if (event.type === 'checkout.session.expired') {
            await OrderService.cancelUnpaid(payment.orderId); // gives the reserved stock back
        }
    },
};
