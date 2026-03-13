import prisma from '../../../shared/prisma';

export const CartService = {
    create: async (data: any) => prisma.cart.create({ data }),
    list: async () => prisma.cart.findMany(),
    getOne: async (id: number) => prisma.cart.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.cart.update({ where: { id }, data }),
    remove: async (id: number) => prisma.cart.delete({ where: { id } }),
};
