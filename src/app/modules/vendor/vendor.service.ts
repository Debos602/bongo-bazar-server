import prisma from '../../../shared/prisma';
import { Prisma } from '@prisma/client';

export const VendorService = {
    // Create a new vendor (user becomes vendor) - with transaction
    create: async (userId: number, shopName: string) => {
        const existingVendor = await prisma.vendor.findUnique({
            where: { userId }
        });

        if (existingVendor) {
            throw new Error('User is already a vendor');
        }

        // Use transaction to ensure both vendor creation and user role update happen atomically
        const vendor = await prisma.$transaction(async (tx) => {
            // Step 1: Create vendor record
            const newVendor = await tx.vendor.create({
                data: {
                    userId,
                    shopName
                }
            });

            // Step 2: Update user role to VENDOR
            await tx.user.update({
                where: { id: userId },
                data: { role: 'VENDOR' }
            });

            // Step 3: Fetch vendor with user details
            const vendorWithUser = await tx.vendor.findUnique({
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
        });

        return vendor;
    },

    // Get all vendors with pagination
    list: async (page: number = 1, limit: number = 10) => {
        const skip = (page - 1) * limit;

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
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
            prisma.vendor.count()
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
    },

    // Get vendor by ID
    getOne: async (id: number) => {
        const vendor = await prisma.vendor.findUnique({
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
    },

    // Get vendor by user ID
    getByUserId: async (userId: number) => {
        const vendor = await prisma.vendor.findUnique({
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
    },

    // Update vendor profile
    update: async (id: number, data: Partial<{ shopName: string; }>) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id }
        });

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        const updated = await prisma.vendor.update({
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
    },

    // Get vendor statistics
    getVendorStats: async (vendorId: number) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId }
        });

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        const [totalProducts, totalOrders, totalRevenue, avgRating] = await Promise.all([
            prisma.product.count({
                where: { vendorId }
            }),
            prisma.orderItem.count({
                where: {
                    product: {
                        vendorId
                    }
                }
            }),
            prisma.orderItem.aggregate({
                where: {
                    product: {
                        vendorId
                    }
                },
                _sum: {
                    price: true
                }
            }),
            prisma.review.aggregate({
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
    },

    // Get vendor products
    getVendorProducts: async (vendorId: number, page: number = 1, limit: number = 10) => {
        const skip = (page - 1) * limit;

        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId }
        });

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
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
            prisma.product.count({
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
    },

    // Delete vendor (soft delete by inactivating)
    remove: async (id: number) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id }
        });

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        // Mark user as inactive instead of deleting
        await prisma.user.update({
            where: { id: vendor.userId },
            data: { status: 'INACTIVE' }
        });

        return { message: 'Vendor deactivated successfully' };
    },

    // Search vendors
    search: async (query: string, page: number = 1, limit: number = 10) => {
        const skip = (page - 1) * limit;

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
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
            prisma.vendor.count({
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
    }
};
