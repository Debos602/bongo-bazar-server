import { Prisma } from '@prisma/client';
import prisma from '../../../shared/prisma';

export const CartService = {
    create: async (data: Prisma.CartCreateInput) => prisma.cart.create({ data }),
    list: async () => prisma.cart.findMany(),
    getOne: async (id: number) => prisma.cart.findUnique({ where: { id } }),
    update: async (id: number, data: Prisma.CartUpdateInput) => prisma.cart.update({ where: { id }, data }),
    remove: async (id: number) => prisma.cart.delete({ where: { id } }),
    getCartCount: async (userId: number) => {
        return prisma.cart.count({
            where: { userId }
        });
    }
};
