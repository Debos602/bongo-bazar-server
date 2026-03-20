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
exports.CartService = void 0;
const prisma_1 = __importDefault(require("../../../shared/prisma"));
exports.CartService = {
    create: (data) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.cart.upsert({
            where: {
                userId_productId: {
                    userId: data.userId,
                    productId: data.productId,
                },
            },
            update: {
                quantity: { increment: data.quantity },
            },
            create: {
                quantity: data.quantity,
                product: { connect: { id: data.productId } },
                user: { connect: { id: data.userId } },
            },
        });
    }),
    list: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.cart.findMany({
            where: { userId }, // ✅ object হবে
            include: { product: true } // ✅ product details সহ আসবে
        });
    }),
    getOne: (id) => __awaiter(void 0, void 0, void 0, function* () { return prisma_1.default.cart.findUnique({ where: { id } }); }),
    update: (id, data) => __awaiter(void 0, void 0, void 0, function* () { return prisma_1.default.cart.update({ where: { id }, data }); }),
    remove: (id) => __awaiter(void 0, void 0, void 0, function* () { return prisma_1.default.cart.delete({ where: { id } }); }),
    getCartCount: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // ✅ Transaction বাদ — আলাদা আলাদা query
        const [totalItems, totalQuantityResult] = yield Promise.all([
            prisma_1.default.cart.count({ where: { userId } }),
            prisma_1.default.cart.aggregate({
                where: { userId },
                _sum: { quantity: true },
            }),
        ]);
        return {
            totalItems,
            totalQuantity: (_a = totalQuantityResult._sum.quantity) !== null && _a !== void 0 ? _a : 0,
        };
    }),
};
