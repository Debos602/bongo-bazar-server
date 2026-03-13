import prisma from '../../../shared/prisma';
import { Prisma, Role } from '@prisma/client';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { productSearchableFields } from './product.constant';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { VendorService } from '../vendor/vendor.service';

// Single, consistent product service with intuitive method names.
export const productService = {
    // Create product (vendorId optional for admins)
    async create(data: Prisma.ProductCreateInput, vendorId?: number) {
        const payload = { ...data } as any;
        if (vendorId) payload.vendorId = vendorId;
        return prisma.product.create({ data: payload });
    },

    // Update with basic authorization check (caller must supply their own id/role)
    async update(id: number, data: Prisma.ProductCreateInput, requester?: { id: number; role: Role; }) {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');

        if (requester) {
            // Vendor may only update their own products
            if (requester.role === Role.VENDOR) {
                // Get vendorId from userId
                const vendor = await VendorService.getByUserId(requester.id);
                if (!vendor) {
                    throw new ApiError(httpStatus.FORBIDDEN, 'You are not a registered vendor');
                }

                if (product.vendorId !== vendor.id) {
                    throw new ApiError(
                        httpStatus.FORBIDDEN,
                        `Not authorized to update this product. Product belongs to vendor ${product.vendorId}, but you are vendor ${vendor.id}`
                    );
                }
            }
            // Admins and super admins allowed
        }

        return prisma.product.update({ where: { id }, data });
    },

    async remove(id: number) {
        await prisma.product.delete({ where: { id } });
        return { deleted: true };
    },

    async getOne(id: number) {
        return prisma.product.findUnique({ where: { id } });
    },

    async list(params: any = {}, options: IPaginationOptions) {
        const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);
        const { searchTerm, ...filterData } = params;

        const andConditions: Prisma.ProductWhereInput[] = [];

        // Handle search term
        if (searchTerm) {
            andConditions.push({
                OR: productSearchableFields.map(field => ({
                    [field]: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    }
                }))
            });
        }

        // Handle other filters
        if (Object.keys(filterData).length > 0) {
            andConditions.push({
                AND: Object.keys(filterData).map(key => ({
                    [key]: {
                        equals: (filterData as any)[key]
                    }
                }))
            });
        }

        const whereConditions: Prisma.ProductWhereInput =
            andConditions.length > 0 ? { AND: andConditions } : {};

        const result = await prisma.product.findMany({
            where: whereConditions,
            skip,
            take: limit,
            orderBy: sortBy && sortOrder
                ? { [sortBy]: sortOrder }
                : { createdAt: 'desc' },
        });

        const total = await prisma.product.count({
            where: whereConditions
        });

        return {
            meta: { page, limit, total },
            data: result
        };
    },
};

// Backwards-compatible alias used in some older files
export const ProductService = productService;

export default productService;
