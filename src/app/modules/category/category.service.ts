import { Category } from "@prisma/client";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import { IPaginationOptions } from "../../interfaces/pagination";
import { paginationHelper } from "../../../helpers/paginationHelper";

const createCategory = async (payload: {
    name: string;
    slug: string;
}): Promise<Category> => {
    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
        where: { slug: payload.slug }
    });

    if (existingCategory) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Category slug already exists"
        );
    }

    const result = await prisma.category.create({
        data: {
            name: payload.name,
            slug: payload.slug
        }
    });

    return result;
};

const getAllCategories = async (options: IPaginationOptions) => {
    const { page, limit, skip } =
        paginationHelper.calculatePagination(options);

    const result = await prisma.category.findMany({
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

    const total = await prisma.category.count();

    return {
        meta: { page, limit, total },
        data: result
    };
};

const getCategoryById = async (id: number): Promise<Category | null> => {
    const result = await prisma.category.findUnique({
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
};

const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
    const result = await prisma.category.findUnique({
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
};

const updateCategory = async (
    id: number,
    payload: Partial<{ name: string; slug: string; }>
): Promise<Category> => {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
        where: { id }
    });

    if (!existingCategory) {
        throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
    }

    // Check if new slug already exists (if slug is being updated)
    if (payload.slug && payload.slug !== existingCategory.slug) {
        const slugExists = await prisma.category.findUnique({
            where: { slug: payload.slug }
        });

        if (slugExists) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Category slug already exists"
            );
        }
    }

    const result = await prisma.category.update({
        where: { id },
        data: payload
    });

    return result;
};

const deleteCategory = async (id: number): Promise<Category> => {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
        where: { id }
    });

    if (!existingCategory) {
        throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
    }

    // Check if category has associated products
    const productCount = await prisma.productCategory.count({
        where: { categoryId: id }
    });

    if (productCount > 0) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Cannot delete category with associated products"
        );
    }

    const result = await prisma.category.delete({
        where: { id }
    });

    return result;
};

export const categoryService = {
    createCategory,
    getAllCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory
};
