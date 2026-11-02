import { z } from 'zod';
import { addressFields } from '../address/address.validation';

const paymentMethod = z.enum(['CASH_ON_DELIVERY', 'STRIPE']).optional();
const couponCode = z.string().trim().min(1).optional();
const orderStatus = z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

export const orderValidation = {
    withAddress: z.object({ body: addressFields.extend({ couponCode, paymentMethod }) }),
    direct: z.object({
        body: z.object({
            addressId: z.coerce.number().int().positive(),
            productId: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().min(1),
            couponCode,
            paymentMethod,
        }),
    }),
    status: z.object({ body: z.object({ status: orderStatus, trackingNumber: z.string().max(100).optional() }) }),
};
