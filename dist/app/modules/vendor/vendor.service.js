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
exports.VendorService = void 0;
const prisma_1 = __importDefault(require("../../../shared/prisma"));
exports.VendorService = {
    // Create a new vendor (user becomes vendor) - with transaction
    create: (userId, shopName) => __awaiter(void 0, void 0, void 0, function* () {
        const existingVendor = yield prisma_1.default.vendor.findUnique({
            where: { userId }
        });
        if (existingVendor) {
            throw new Error('User is already a vendor');
        }
        // Use transaction to ensure both vendor creation and user role update happen atomically
        const vendor = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Step 1: Create vendor record
            const newVendor = yield tx.vendor.create({
                data: {
                    userId,
                    shopName
                }
            });
            // Step 2: Update user role to VENDOR
            yield tx.user.update({
                where: { id: userId },
                data: { role: 'VENDOR' }
            });
            // Step 3: Fetch vendor with user details
            const vendorWithUser = yield tx.vendor.findUnique({
                where: { id: newVendor.id },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            phone: true,
                            picture: true,
                            role: true,
                            status: true
                        }
                    }
                }
            });
            return vendorWithUser;
        }));
        return vendor;
    }),
    // Get all vendors with pagination
    list: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [vendors, total] = yield Promise.all([
            prisma_1.default.vendor.findMany({
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            phone: true,
                            picture: true,
                            role: true,
                            status: true
                        }
                    },
                    products: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            stock: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma_1.default.vendor.count()
        ]);
        return {
            data: vendors,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }),
    // Get vendor by ID
    getOne: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const vendor = yield prisma_1.default.vendor.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        picture: true,
                        isVerified: true,
                        status: true
                    }
                },
                products: {
                    include: {
                        categories: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            }
        });
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        return vendor;
    }),
    // Get vendor by user ID
    getByUserId: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        const vendor = yield prisma_1.default.vendor.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        picture: true,
                        isVerified: true,
                        status: true
                    }
                },
                products: {
                    include: {
                        categories: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            }
        });
        if (!vendor) {
            throw new Error('Vendor not found for this user');
        }
        return vendor;
    }),
    // Update vendor profile
    update: (id, data) => __awaiter(void 0, void 0, void 0, function* () {
        const vendor = yield prisma_1.default.vendor.findUnique({
            where: { id }
        });
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        const updated = yield prisma_1.default.vendor.update({
            where: { id },
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        picture: true,
                        role: true,
                        status: true
                    }
                }
            }
        });
        return updated;
    }),
    // Get vendor statistics
    getVendorStats: (vendorId) => __awaiter(void 0, void 0, void 0, function* () {
        const vendor = yield prisma_1.default.vendor.findUnique({
            where: { id: vendorId }
        });
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        const [totalProducts, totalOrders, totalRevenue, avgRating] = yield Promise.all([
            prisma_1.default.product.count({
                where: { vendorId }
            }),
            prisma_1.default.orderItem.count({
                where: {
                    product: {
                        vendorId
                    }
                }
            }),
            prisma_1.default.orderItem.aggregate({
                where: {
                    product: {
                        vendorId
                    }
                },
                _sum: {
                    price: true
                }
            }),
            prisma_1.default.review.aggregate({
                where: {
                    product: {
                        vendorId
                    }
                },
                _avg: {
                    rating: true
                }
            })
        ]);
        return {
            vendorId,
            totalProducts,
            totalOrders,
            totalRevenue: totalRevenue._sum.price || 0,
            avgRating: avgRating._avg.rating || 0
        };
    }),
    // Get vendor products
    getVendorProducts: (vendorId_1, ...args_1) => __awaiter(void 0, [vendorId_1, ...args_1], void 0, function* (vendorId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const vendor = yield prisma_1.default.vendor.findUnique({
            where: { id: vendorId }
        });
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        const [products, total] = yield Promise.all([
            prisma_1.default.product.findMany({
                where: { vendorId },
                skip,
                take: limit,
                include: {
                    categories: {
                        include: {
                            category: true
                        }
                    },
                    reviews: {
                        select: {
                            rating: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma_1.default.product.count({
                where: { vendorId }
            })
        ]);
        return {
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }),
    // Delete vendor (soft delete by inactivating)
    remove: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const vendor = yield prisma_1.default.vendor.findUnique({
            where: { id }
        });
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        // Mark user as inactive instead of deleting
        yield prisma_1.default.user.update({
            where: { id: vendor.userId },
            data: { status: 'INACTIVE' }
        });
        return { message: 'Vendor deactivated successfully' };
    }),
    // Search vendors
    search: (query_1, ...args_1) => __awaiter(void 0, [query_1, ...args_1], void 0, function* (query, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [vendors, total] = yield Promise.all([
            prisma_1.default.vendor.findMany({
                where: {
                    OR: [
                        { shopName: { contains: query, mode: 'insensitive' } },
                        { user: { name: { contains: query, mode: 'insensitive' } } }
                    ]
                },
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            phone: true,
                            picture: true,
                            status: true
                        }
                    },
                    products: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }),
            prisma_1.default.vendor.count({
                where: {
                    OR: [
                        { shopName: { contains: query, mode: 'insensitive' } },
                        { user: { name: { contains: query, mode: 'insensitive' } } }
                    ]
                }
            })
        ]);
        return {
            data: vendors,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    })
};
