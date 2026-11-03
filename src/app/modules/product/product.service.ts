import { Prisma, Role } from '@prisma/client';
import httpStatus from 'http-status';
import { paginationHelper } from '../../../helpers/paginationHelper';
import prisma from '../../../shared/prisma';
import { slugify } from '../../../shared/slug';
import ApiError from '../../errors/ApiError';
import { IPaginationOptions } from '../../interfaces/pagination';
import { notify } from '../notification/notification.service';
import { VendorService } from '../vendor/vendor.service';
import { productSearchableFields, productSortableFields } from './product.constant';

const include = {
    categories: { include: { category: true } },
    vendor: { select: { id: true, shopName: true, slug: true } },
} satisfies Prisma.ProductInclude;

export const publicProductWhere: Prisma.ProductWhereInput = {
    isPublished: true,
    isBlocked: false,
    vendor: { status: 'APPROVED' },
};

const buildListWhere = (params: any): Prisma.ProductWhereInput => {
    const { searchTerm, isFeatured, vendorId, categoryId, category, minPrice, maxPrice } = params;
    const and: Prisma.ProductWhereInput[] = [];

    if (searchTerm) {
        and.push({
            OR: productSearchableFields.map((field) => ({
                [field]: { contains: searchTerm, mode: 'insensitive' },
            })),
        });
    }
    if (isFeatured !== undefined) and.push({ isFeatured: isFeatured === 'true' || isFeatured === true });
    if (vendorId) and.push({ vendorId: Number(vendorId) });
    if (categoryId) and.push({ categories: { some: { categoryId: Number(categoryId) } } });
    if (category) and.push({ categories: { some: { category: { slug: String(category) } } } });
    if (minPrice || maxPrice) {
        and.push({
            price: {
                ...(minPrice ? { gte: Number(minPrice) } : {}),
                ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
        });
    }
    return { AND: and };
};

const runList = async (where: Prisma.ProductWhereInput, options: IPaginationOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);
    const [data, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            include,
            orderBy: productSortableFields.includes(sortBy)
                ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
                : { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
    ]);
    return { meta: { page, limit, total }, data };
};

const assertCanManage = async (productId: number, requester: { id: number; role: Role; }) => {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    if (requester.role === Role.VENDOR) {
        const vendor = await VendorService.getApprovedByUserId(requester.id);
        if (product.vendorId !== vendor.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only manage your own products');
        }
    }
    return product;
};

export const productService = {
    async create(data: any, vendorId: number) {
        const { categories, slug, ...productData } = data;
        return prisma.product.create({
            data: {
                ...productData,
                images: productData.images ?? [],
                tags: productData.tags ?? [],
                slug: slug || slugify(productData.name),
                vendorId,
                categories: categories?.length
                    ? { create: categories.map((categoryId: number) => ({ categoryId })) }
                    : undefined,
            },
            include,
        });
    },

    async update(id: number, data: any, requester: { id: number; role: Role; }) {
        await assertCanManage(id, requester);
        const { categories, ...productData } = data;

        return prisma.$transaction(async (tx) => {
            if (categories) {
                await tx.productCategory.deleteMany({ where: { productId: id } });
                await tx.productCategory.createMany({
                    data: categories.map((categoryId: number) => ({ productId: id, categoryId })),
                });
            }
            return tx.product.update({ where: { id }, data: productData, include });
        });
    },

    async moderate(id: number, data: { isBlocked?: boolean; isFeatured?: boolean; }) {
        return prisma.$transaction(async (tx) => {
            const before = await tx.product.findUnique({ where: { id }, select: { isBlocked: true, name: true, vendor: { select: { userId: true } } } });
            if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
            const product = await tx.product.update({ where: { id }, data, include });
            if (data.isBlocked !== undefined && data.isBlocked !== before.isBlocked) {
                await notify(tx, {
                    userId: before.vendor.userId,
                    title: data.isBlocked ? 'A product was blocked by an admin' : 'A product was unblocked',
                    body: before.name,
                    link: `/dashboard/vendor/products/${id}`,
                });
            }
            return product;
        });
    },

    // A product on past orders has to stay for order history, so it is hidden instead.
    async remove(id: number, requester: { id: number; role: Role; }) {
        await assertCanManage(id, requester);

        return prisma.$transaction(async (tx) => {
            const orderCount = await tx.orderItem.count({ where: { productId: id } });
            await tx.cart.deleteMany({ where: { productId: id } });
            await tx.wishlist.deleteMany({ where: { productId: id } });
            if (orderCount > 0) {
                await tx.product.update({ where: { id }, data: { isPublished: false, stock: 0 } });
                return { deleted: false, unpublished: true };
            }
            await tx.review.deleteMany({ where: { productId: id } });
            await tx.productCategory.deleteMany({ where: { productId: id } });
            await tx.product.delete({ where: { id } });
            return { deleted: true, unpublished: false };
        });
    },

    async getOne(id: number) {
        const product = await prisma.product.findFirst({ where: { id, ...publicProductWhere }, include });
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
        return product;
    },

    async getBySlug(slug: string) {
        const product = await prisma.product.findFirst({ where: { slug, ...publicProductWhere }, include });
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
        return product;
    },

    async list(params: any = {}, options: IPaginationOptions) {
        return runList({ AND: [publicProductWhere, buildListWhere(params)] }, options);
    },

    async listMine(userId: number, params: any, options: IPaginationOptions) {
        const vendor = await VendorService.getByUserId(userId);
        const { vendorId: _ignored, ...rest } = params;
        return runList({ AND: [{ vendorId: vendor.id }, buildListWhere(rest)] }, options);
    },

    async getMine(id: number, requester: { id: number; role: Role; }) {
        await assertCanManage(id, requester);
        return prisma.product.findUniqueOrThrow({ where: { id }, include });
    },

    async adminList(params: any, options: IPaginationOptions) {
        return runList(buildListWhere(params), options);
    },
};

export const ProductService = productService;

export default productService;
