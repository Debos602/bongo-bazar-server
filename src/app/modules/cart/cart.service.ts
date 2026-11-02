import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';
import { publicProductWhere } from '../product/product.service';

const quantityOf = (value: unknown) => {
    const quantity = Number(value ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be a whole number of at least 1');
    }
    return quantity;
};

const productInclude = {
    product: { include: { vendor: { select: { id: true, shopName: true, slug: true } } } },
};

export const CartService = {
    create: async (data: { productId: number; quantity?: number; userId: number; }) => {
        const quantity = quantityOf(data.quantity);
        const productId = Number(data.productId);
        const product = await prisma.product.findFirst({ where: { id: productId, ...publicProductWhere } });
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not available');

        const existing = await prisma.cart.findUnique({ where: { userId_productId: { userId: data.userId, productId } } });
        if ((existing?.quantity ?? 0) + quantity > product.stock) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Only ${product.stock} in stock`);
        }

        return prisma.cart.upsert({
            where: { userId_productId: { userId: data.userId, productId } },
            update: { quantity: { increment: quantity } },
            create: { quantity, productId, userId: data.userId },
            include: productInclude,
        });
    },

    list: async (userId: number) => prisma.cart.findMany({
        where: { userId },
        include: productInclude,
        orderBy: { createdAt: 'desc' },
    }),

    getOne: async (id: number, userId: number) => {
        const item = await prisma.cart.findFirst({ where: { id, userId }, include: productInclude });
        if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
        return item;
    },

    update: async (id: number, userId: number, data: { quantity?: unknown; }) => {
        const item = await prisma.cart.findFirst({ where: { id, userId }, include: { product: true } });
        if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
        const quantity = quantityOf(data.quantity);
        if (quantity > item.product.stock) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Only ${item.product.stock} in stock`);
        }
        return prisma.cart.update({ where: { id }, data: { quantity }, include: productInclude });
    },

    remove: async (id: number, userId: number) => {
        const { count } = await prisma.cart.deleteMany({ where: { id, userId } });
        if (!count) throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
    },

    getCartCount: async (userId: number) => {
        const [totalItems, totalQuantityResult] = await Promise.all([
            prisma.cart.count({ where: { userId } }),
            prisma.cart.aggregate({ where: { userId }, _sum: { quantity: true } }),
        ]);
        return { totalItems, totalQuantity: totalQuantityResult._sum.quantity ?? 0 };
    },
};
