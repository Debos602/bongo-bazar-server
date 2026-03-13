import prisma from '../../../shared/prisma';

export const OrderService = {
    create: async (data: any) => prisma.order.create({ data }),
    list: async () => prisma.order.findMany(),
    getOne: async (id: number) => prisma.order.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.order.update({ where: { id }, data }),
    remove: async (id: number) => prisma.order.delete({ where: { id } }),
};
