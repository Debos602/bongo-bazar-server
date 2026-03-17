import { Prisma } from '@prisma/client';
import prisma from '../../../shared/prisma';

export const CartService = {
    create: async (data: { productId: number; quantity: number; userId: number; }) => {
        return prisma.cart.upsert({
            where: {
                userId_productId: {
                    userId: data.userId,
                    productId: data.productId,
                },
            },
            update: {
                quantity: { increment: data.quantity },
            },
            create: {
                quantity: data.quantity,
                product: { connect: { id: data.productId } },
                user: { connect: { id: data.userId } },
            },
        });
    },
    list: async (userId: number) => prisma.cart.findMany({
        where: { userId },  // ✅ object হবে
        include: { product: true } // ✅ product details সহ আসবে
    }),
    getOne: async (id: number) => prisma.cart.findUnique({ where: { id } }),
    update: async (id: number, data: Prisma.CartUpdateInput) => prisma.cart.update({ where: { id }, data }),
    remove: async (id: number) => prisma.cart.delete({ where: { id } }),
    getCartCount: async (userId: number) => {
        const [totalItems, totalQuantityResult] = await prisma.$transaction([
            // ✅ unique product count → cart icon এ
            prisma.cart.count({ where: { userId } }),

            // ✅ মোট quantity → "SELECT ALL (8 ITEM(S))" এ
            prisma.cart.aggregate({
                where: { userId },
                _sum: { quantity: true },
            }),
        ]);

        return {
            totalItems,
            totalQuantity: totalQuantityResult._sum.quantity ?? 0,
        };
    },
};
