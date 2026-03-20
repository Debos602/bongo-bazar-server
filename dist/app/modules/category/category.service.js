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
exports.categoryService = void 0;
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const paginationHelper_1 = require("../../../helpers/paginationHelper");
const createCategory = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if slug already exists
    const existingCategory = yield prisma_1.default.category.findUnique({
        where: { slug: payload.slug }
    });
    if (existingCategory) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Category slug already exists");
    }
    const result = yield prisma_1.default.category.create({
        data: {
            name: payload.name,
            slug: payload.slug
        }
    });
    return result;
});
const getAllCategories = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const result = yield prisma_1.default.category.findMany({
        skip,
        take: limit,
        orderBy: options.sortBy && options.sortOrder
            ? { [options.sortBy]: options.sortOrder }
            : { id: "asc" },
        include: {
            products: {
                select: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            image: true
                        }
                    }
                }
            }
        }
    });
    const total = yield prisma_1.default.category.count();
    return {
        meta: { page, limit, total },
        data: result
    };
});
const getCategoryById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.default.category.findUnique({
        where: { id },
        include: {
            products: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            image: true,
                            description: true
                        }
                    }
                }
            }
        }
    });
    return result;
});
const getCategoryBySlug = (slug) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.default.category.findUnique({
        where: { slug },
        include: {
            products: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            image: true,
                            description: true,
                            stock: true,
                            rating: true
                        }
                    }
                }
            }
        }
    });
    return result;
});
const updateCategory = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if category exists
    const existingCategory = yield prisma_1.default.category.findUnique({
        where: { id }
    });
    if (!existingCategory) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Category not found");
    }
    // Check if new slug already exists (if slug is being updated)
    if (payload.slug && payload.slug !== existingCategory.slug) {
        const slugExists = yield prisma_1.default.category.findUnique({
            where: { slug: payload.slug }
        });
        if (slugExists) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Category slug already exists");
        }
    }
    const result = yield prisma_1.default.category.update({
        where: { id },
        data: payload
    });
    return result;
});
const deleteCategory = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if category exists
    const existingCategory = yield prisma_1.default.category.findUnique({
        where: { id }
    });
    if (!existingCategory) {
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "Category not found");
    }
    // Check if category has associated products
    const productCount = yield prisma_1.default.productCategory.count({
        where: { categoryId: id }
    });
    if (productCount > 0) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Cannot delete category with associated products");
    }
    const result = yield prisma_1.default.category.delete({
        where: { id }
    });
    return result;
});
exports.categoryService = {
    createCategory,
    getAllCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory
};
