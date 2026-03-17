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
        return prisma.cart.count({
            where: { userId }
        });
    }
};
