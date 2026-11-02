import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';

export const WishlistService = {
    add: async (userId: number, productId: number) => {
        if (!Number.isInteger(productId)) throw new ApiError(httpStatus.BAD_REQUEST, 'productId is required');
        return prisma.wishlist.upsert({
            where: { userId_productId: { userId, productId } },
            update: {},
            create: { userId, productId },
            include: { product: true },
        });
    },
    list: async (userId: number) => prisma.wishlist.findMany({
        where: { userId },
        include: { product: { include: { vendor: { select: { id: true, shopName: true, slug: true, status: true } } } } },
        orderBy: { createdAt: 'desc' },
    }),
    remove: async (id: number, userId: number) => {
        const { count } = await prisma.wishlist.deleteMany({ where: { id, userId } });
        if (!count) throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist item not found');
    },
    clear: async (userId: number) => {
        await prisma.wishlist.deleteMany({ where: { userId } });
    },
    removeByProduct: async (productId: number, userId: number) => {
        await prisma.wishlist.deleteMany({ where: { productId, userId } });
    },
};
