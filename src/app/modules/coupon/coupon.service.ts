import { Prisma, Role } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import { roundMoney } from '../../../shared/money';
import ApiError from '../../errors/ApiError';
import { VendorService } from '../vendor/vendor.service';

type Requester = { id: number; role: Role; };

const assertOwned = async (id: number, requester: Requester) => {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    if (requester.role === Role.VENDOR) {
        const vendor = await VendorService.getApprovedByUserId(requester.id);
        if (coupon.vendorId !== vendor.id) throw new ApiError(httpStatus.FORBIDDEN, 'You can only manage your own coupons');
    }
    return coupon;
};

export const findUsableCoupon = async (client: Prisma.TransactionClient | typeof prisma, code: string) => {
    const coupon = await client.coupon.findFirst({
        where: {
            code: code.trim().toUpperCase(),
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
    });
    if (!coupon || (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired coupon');
    }
    return coupon;
};

export const CouponService = {
    // A vendor's coupon is always tied to its own shop; an admin's coupon is platform-wide.
    create: async (data: any, requester: Requester) => {
        const vendorId = requester.role === Role.VENDOR
            ? (await VendorService.getApprovedByUserId(requester.id)).id
            : null;
        return prisma.coupon.create({ data: { ...data, vendorId } });
    },
    list: async (requester: Requester) => {
        const where = requester.role === Role.VENDOR
            ? { vendorId: (await VendorService.getByUserId(requester.id)).id }
            : {};
        return prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
    },
    getOne: assertOwned,
    update: async (id: number, data: any, requester: Requester) => {
        await assertOwned(id, requester);
        return prisma.coupon.update({ where: { id }, data });
    },
    remove: async (id: number, requester: Requester) => {
        await assertOwned(id, requester);
        await prisma.coupon.delete({ where: { id } });
    },

    // Previews the discount on the shopper's current cart (the checkout page uses this).
    validate: async (code: string, userId: number) => {
        const coupon = await findUsableCoupon(prisma, code);
        const cart = await prisma.cart.findMany({ where: { userId }, include: { product: true } });
        const eligible = cart.filter((i) => !coupon.vendorId || i.product.vendorId === coupon.vendorId);
        if (cart.length && !eligible.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon does not apply to the items in your cart');
        }
        const subtotal = roundMoney(cart.reduce((s, i) => s + i.product.price * i.quantity, 0));
        const eligibleSubtotal = eligible.reduce((s, i) => s + i.product.price * i.quantity, 0);
        const discount = roundMoney((eligibleSubtotal * coupon.discount) / 100);
        return { code: coupon.code, percent: coupon.discount, vendorId: coupon.vendorId, subtotal, discount, total: roundMoney(subtotal - discount) };
    },
};
