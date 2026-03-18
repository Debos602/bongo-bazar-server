import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

export const OrderService = {
    createWithAddress: async (
        userId: number,
        addressData: {
            fullName: string;
            phone: string;
            city: string;
            area: string;
            address: string;
            postalCode?: string;
        },
        couponCode?: string
    ) => {
        return prisma.$transaction(async (tx) => {

            // ১. Cart items নাও
            const cartItems = await tx.cart.findMany({
                where: { userId },
                include: { product: true },
            });

            if (cartItems.length === 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Cart is empty');
            }

            // ২. Stock check
            for (const item of cartItems) {
                if (item.product.stock < item.quantity) {
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        `"${item.product.name}" এর stock নেই (available: ${item.product.stock})`
                    );
                }
            }

            // ৩. Address create করো
            const address = await tx.address.create({
                data: { ...addressData, userId },
            });

            // ৪. Total calculate
            let total = cartItems.reduce(
                (sum, item) => sum + item.product.price * item.quantity, 0
            );

            // ৫. Coupon apply
            if (couponCode) {
                const coupon = await tx.coupon.findFirst({
                    where: {
                        code: couponCode,
                        isActive: true,
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } },
                        ],
                    },
                });

                if (!coupon) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired coupon');
                }

                total = total - (total * coupon.discount) / 100;
            }

            // ৬. Order create
            const order = await tx.order.create({
                data: {
                    userId,
                    addressId: address.id,
                    total: Math.round(total * 100) / 100,
                    status: 'PENDING',
                    items: {
                        create: cartItems.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.product.price,
                        })),
                    },
                },
                include: {
                    items: { include: { product: true } },
                    address: true,
                },
            });

            // ৭. Stock কমাও
            await Promise.all(
                cartItems.map((item) =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } },
                    })
                )
            );

            // ৮. Cart clear
            await tx.cart.deleteMany({ where: { userId } });

            return order;
        }, {
            maxWait: 10000,
            timeout: 30000,
        });
    },


    // ✅ Single product থেকে সরাসরি order (Buy Now)
    createDirect: async (
        userId: number,
        addressId: number,
        productId: number,
        quantity: number,
        couponCode?: string
    ) => {
        return prisma.$transaction(async (tx) => {

            const product = await tx.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
            }

            if (product.stock < quantity) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `Stock নেই (available: ${product.stock})`
                );
            }

            let total = product.price * quantity;

            // Coupon apply
            if (couponCode) {
                const coupon = await tx.coupon.findFirst({
                    where: {
                        code: couponCode,
                        isActive: true,
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } },
                        ],
                    },
                });

                if (!coupon) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired coupon');
                }

                total = total - (total * coupon.discount) / 100;
            }

            const order = await tx.order.create({
                data: {
                    userId,
                    addressId,
                    total: Math.round(total * 100) / 100,
                    status: 'PENDING',
                    items: {
                        create: [{ productId, quantity, price: product.price }],
                    },
                },
                include: {
                    items: { include: { product: true } },
                    address: true,
                },
            });

            // Stock কমাও
            await tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } },
            });

            return order;
        });
    },

    list: async (userId: number) =>
        prisma.order.findMany({
            where: { userId },
            include: {
                items: { include: { product: true } },
                address: true,
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        }),

    getOne: async (id: number, userId: number) =>
        prisma.order.findFirst({
            where: { id, userId },
            include: {
                items: { include: { product: true } },
                address: true,
                payment: true,
            },
        }),

    updateStatus: async (id: number, status: string) =>
        prisma.order.update({
            where: { id },
            data: { status: status as any },
        }),

    remove: async (id: number) =>
        prisma.order.delete({ where: { id } }),
};