import prisma from '../../../shared/prisma';

export const AddressService = {
    // ✅ userId token থেকে নেবে
    create: async (userId: number, data: any) =>
        prisma.address.create({
            data: { ...data, userId },
        }),

    // ✅ শুধু নিজের address দেখাবে
    list: async (userId: number) =>
        prisma.address.findMany({
            where: { userId },
        }),

    getOne: async (id: number, userId: number) =>
        prisma.address.findFirst({
            where: { id, userId }, // ✅ অন্যের address দেখা যাবে না
        }),

    update: async (id: number, userId: number, data: any) =>
        prisma.address.update({
            where: { id, userId },
            data,
        }),

    remove: async (id: number, userId: number) =>
        prisma.address.delete({
            where: { id, userId },
        }),
};