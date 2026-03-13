import prisma from '../../../shared/prisma';

export const AddressService = {
    create: async (data: any) => prisma.address.create({ data }),
    list: async () => prisma.address.findMany(),
    getOne: async (id: number) => prisma.address.findUnique({ where: { id } }),
    update: async (id: number, data: any) => prisma.address.update({ where: { id }, data }),
    remove: async (id: number) => prisma.address.delete({ where: { id } }),
};
