import prisma from '../../../shared/prisma';

export const WishlistService = {
    create: async (data: any) => prisma.wishlist.create({ data }),
    list: async () => prisma.wishlist.findMany(),
    getOne: async (id: number) => prisma.wishlist.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.wishlist.update({ where: { id }, data }),
    remove: async (id: number) => prisma.wishlist.delete({ where: { id } }),
};
