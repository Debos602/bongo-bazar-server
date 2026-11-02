import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';

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

    getOne: async (id: number, userId: number) => {
        const address = await prisma.address.findFirst({
            where: { id, userId }, // ✅ অন্যের address দেখা যাবে না
        });
        if (!address) throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
        return address;
    },

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