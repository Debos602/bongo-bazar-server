import { Prisma, Role } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import { roundMoney } from '../../../shared/money';
import ApiError from '../../errors/ApiError';
import { VendorService } from '../vendor/vendor.service';

const reviewer = { select: { id: true, name: true, picture: true } };

const refreshRating = async (tx: Prisma.TransactionClient, productId: number) => {
    const stats = await tx.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
    await tx.product.update({
        where: { id: productId },
        data: { rating: roundMoney(stats._avg.rating ?? 0), reviewCount: stats._count },
    });
};

export const ReviewService = {
    // Only someone who received the product can review it, once.
    create: async (userId: number, data: { productId: number; rating: number; comment?: string; }) => {
        const delivered = await prisma.orderItem.findFirst({
            where: { productId: data.productId, order: { userId }, vendorOrder: { status: 'DELIVERED' } },
        });
        if (!delivered) throw new ApiError(httpStatus.FORBIDDEN, 'You can review a product after it has been delivered to you');

        const existing = await prisma.review.findFirst({ where: { userId, productId: data.productId } });
        if (existing) throw new ApiError(httpStatus.CONFLICT, 'You have already reviewed this product');

        return prisma.$transaction(async (tx) => {
            const review = await tx.review.create({ data: { ...data, userId } });
            await refreshRating(tx, data.productId);
            return review;
        });
    },

    list: async (filters: { productId?: number; page: number; limit: number; }) => {
        const where: Prisma.ReviewWhereInput = filters.productId ? { productId: filters.productId } : {};
        const [data, total] = await Promise.all([
            prisma.review.findMany({
                where, skip: (filters.page - 1) * filters.limit, take: filters.limit,
                include: { user: reviewer, product: { select: { id: true, name: true, image: true } } }, orderBy: { createdAt: 'desc' },
            }),
            prisma.review.count({ where }),
        ]);
        return { meta: { page: filters.page, limit: filters.limit, total }, data };
    },

    mine: async (userId: number) => prisma.review.findMany({
        where: { userId },
        include: { product: { select: { id: true, name: true, image: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
    }),

    forVendor: async (userId: number) => {
        const vendor = await VendorService.getByUserId(userId);
        return prisma.review.findMany({
            where: { product: { vendorId: vendor.id } },
            include: { user: reviewer, product: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    getOne: async (id: number) => {
        const review = await prisma.review.findUnique({ where: { id }, include: { user: reviewer } });
        if (!review) throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
        return review;
    },

    update: async (id: number, userId: number, data: { rating?: number; comment?: string; }) => {
        const review = await prisma.review.findFirst({ where: { id, userId } });
        if (!review) throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
        return prisma.$transaction(async (tx) => {
            const updated = await tx.review.update({ where: { id }, data });
            await refreshRating(tx, review.productId);
            return updated;
        });
    },

    remove: async (id: number, requester: { id: number; role: Role; }) => {
        const review = await prisma.review.findUnique({ where: { id } });
        if (!review) throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
        const isAdmin = requester.role === Role.ADMIN || requester.role === Role.SUPER_ADMIN;
        if (!isAdmin && review.userId !== requester.id) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
        await prisma.$transaction(async (tx) => {
            await tx.review.delete({ where: { id } });
            await refreshRating(tx, review.productId);
        });
    },
};
