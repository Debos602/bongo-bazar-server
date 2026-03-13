import prisma from '../../../shared/prisma';

export const CouponService = {
    create: async (data: any) => prisma.coupon.create({ data }),
    list: async () => prisma.coupon.findMany(),
    getOne: async (id: number) => prisma.coupon.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.coupon.update({ where: { id }, data }),
    remove: async (id: number) => prisma.coupon.delete({ where: { id } }),
};
