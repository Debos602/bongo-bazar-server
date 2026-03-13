import prisma from '../../../shared/prisma';

export const PostService = {
    create: async (data: any) => prisma.post.create({ data }),
    list: async () => prisma.post.findMany(),
    getOne: async (id: number) => prisma.post.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.post.update({ where: { id }, data }),
    remove: async (id: number) => prisma.post.delete({ where: { id } }),
};
