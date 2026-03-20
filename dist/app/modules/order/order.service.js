"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
exports.OrderService = {
    createWithAddress: (userId, addressData, couponCode) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // ১. Cart items নাও
            const cartItems = yield tx.cart.findMany({
                where: { userId },
                include: { product: true },
            });
            if (cartItems.length === 0) {
                throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Cart is empty');
            }
            // ২. Stock check
            for (const item of cartItems) {
                if (item.product.stock < item.quantity) {
                    throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `"${item.product.name}" এর stock নেই (available: ${item.product.stock})`);
                }
            }
            // ৩. Address create করো
            const address = yield tx.address.create({
                data: Object.assign(Object.assign({}, addressData), { userId }),
            });
            // ৪. Total calculate
            let total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
            // ৫. Coupon apply
            if (couponCode) {
                const coupon = yield tx.coupon.findFirst({
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
                    throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid or expired coupon');
                }
                total = total - (total * coupon.discount) / 100;
            }
            // ৬. Order create
            const order = yield tx.order.create({
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
            yield Promise.all(cartItems.map((item) => tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            })));
            // ৮. Cart clear
            yield tx.cart.deleteMany({ where: { userId } });
            return order;
        }), {
            maxWait: 10000,
            timeout: 30000,
        });
    }),
    // ✅ Single product থেকে সরাসরি order (Buy Now)
    createDirect: (userId, addressId, productId, quantity, couponCode) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const product = yield tx.product.findUnique({
                where: { id: productId },
            });
            if (!product) {
                throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'Product not found');
            }
            if (product.stock < quantity) {
                throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Stock নেই (available: ${product.stock})`);
            }
            let total = product.price * quantity;
            // Coupon apply
            if (couponCode) {
                const coupon = yield tx.coupon.findFirst({
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
                    throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid or expired coupon');
                }
                total = total - (total * coupon.discount) / 100;
            }
            const order = yield tx.order.create({
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
            yield tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } },
            });
            return order;
        }));
    }),
    list: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.order.findMany({
            where: { userId },
            include: {
                items: { include: { product: true } },
                address: true,
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }),
    getOne: (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.order.findFirst({
            where: { id, userId },
            include: {
                items: { include: { product: true } },
                address: true,
                payment: true,
            },
        });
    }),
    updateStatus: (id, status) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.order.update({
            where: { id },
            data: { status: status },
        });
    }),
    remove: (id) => __awaiter(void 0, void 0, void 0, function* () { return prisma_1.default.order.delete({ where: { id } }); }),
};
