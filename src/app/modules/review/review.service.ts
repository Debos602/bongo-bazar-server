import prisma from '../../../shared/prisma';

export const ReviewService = {
    create: async (data: any) => prisma.review.create({ data }),
    list: async () => prisma.review.findMany(),
    getOne: async (id: number) => prisma.review.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.review.update({ where: { id }, data }),
    remove: async (id: number) => prisma.review.delete({ where: { id } }),
};
