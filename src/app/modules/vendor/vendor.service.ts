import { Prisma, Role, VendorStatus } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import { slugify } from '../../../shared/slug';
import ApiError from '../../errors/ApiError';
import { notify, notifyAdmins } from '../notification/notification.service';

// Safe for anyone to see: no owner email or phone.
const publicSelect = {
    id: true, shopName: true, slug: true, description: true, logo: true, banner: true,
    createdAt: true, _count: { select: { products: { where: { isPublished: true, isBlocked: false } } } },
} satisfies Prisma.VendorSelect;

const ownerSelect = { id: true, email: true, name: true, phone: true, picture: true, role: true, status: true } as const;

const paginated = <T>(data: T[], page: number, limit: number, total: number) => ({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});

const publicWhere = (query?: string): Prisma.VendorWhereInput => ({
    status: VendorStatus.APPROVED,
    ...(query ? { shopName: { contains: query, mode: 'insensitive' as const } } : {}),
});

export const VendorService = {
    // A customer applies to sell. Role changes only when an admin approves.
    create: async (userId: number, payload: Prisma.VendorUncheckedCreateInput | any) => {
        const existing = await prisma.vendor.findUnique({ where: { userId } });
        if (existing && existing.status !== VendorStatus.REJECTED) {
            throw new ApiError(httpStatus.CONFLICT, 'You already have a vendor account or a pending application');
        }
        return prisma.$transaction(async (tx) => {
            const vendor = existing
                ? await tx.vendor.update({
                    where: { id: existing.id },
                    data: { ...payload, status: VendorStatus.PENDING, rejectionReason: null },
                })
                : await tx.vendor.create({
                    data: { ...payload, userId, slug: slugify(payload.shopName), status: VendorStatus.PENDING },
                });
            await notifyAdmins(tx, {
                title: 'New seller application',
                body: vendor.shopName,
                link: '/dashboard/admin/vendors?status=PENDING',
            });
            return vendor;
        });
    },

    list: async (page = 1, limit = 10) => {
        const where = publicWhere();
        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({ where, skip: (page - 1) * limit, take: limit, select: publicSelect, orderBy: { createdAt: 'desc' } }),
            prisma.vendor.count({ where }),
        ]);
        return paginated(vendors, page, limit, total);
    },

    search: async (query: string, page = 1, limit = 10) => {
        const where = publicWhere(query);
        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({ where, skip: (page - 1) * limit, take: limit, select: publicSelect }),
            prisma.vendor.count({ where }),
        ]);
        return paginated(vendors, page, limit, total);
    },

    adminList: async (status: VendorStatus | undefined, page = 1, limit = 10) => {
        const where: Prisma.VendorWhereInput = status ? { status } : {};
        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
                include: { user: { select: ownerSelect }, _count: { select: { products: true, vendorOrders: true } } },
            }),
            prisma.vendor.count({ where }),
        ]);
        return paginated(vendors, page, limit, total);
    },

    getOne: async (id: number) => {
        const vendor = await prisma.vendor.findFirst({ where: { id, status: VendorStatus.APPROVED }, select: publicSelect });
        if (!vendor) throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
        return vendor;
    },

    getBySlug: async (slug: string) => {
        const vendor = await prisma.vendor.findFirst({ where: { slug, status: VendorStatus.APPROVED }, select: publicSelect });
        if (!vendor) throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
        return vendor;
    },

    getByUserId: async (userId: number) => {
        const vendor = await prisma.vendor.findUnique({
            where: { userId },
            include: { user: { select: ownerSelect } },
        });
        if (!vendor) throw new ApiError(httpStatus.NOT_FOUND, 'Vendor profile not found');
        return vendor;
    },

    // For anything a vendor changes or sells: the shop must be approved.
    getApprovedByUserId: async (userId: number) => {
        const vendor = await prisma.vendor.findUnique({ where: { userId } });
        if (!vendor) throw new ApiError(httpStatus.FORBIDDEN, 'You are not a registered vendor');
        if (vendor.status !== VendorStatus.APPROVED) {
            throw new ApiError(httpStatus.FORBIDDEN, `Your shop is ${vendor.status.toLowerCase()}`);
        }
        return vendor;
    },

    update: async (id: number, data: Prisma.VendorUpdateInput, requester: { id: number; role: Role; }) => {
        const vendor = await prisma.vendor.findUnique({ where: { id } });
        if (!vendor) throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
        if (requester.role === Role.VENDOR && vendor.userId !== requester.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own shop');
        }
        return prisma.vendor.update({ where: { id }, data });
    },

    setStatus: async (id: number, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) => {
        const vendor = await prisma.vendor.findUnique({ where: { id } });
        if (!vendor) throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
        // A running shop has products and orders, so it is suspended rather than rejected.
        if (status === 'REJECTED' && vendor.status !== VendorStatus.PENDING) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Only a pending application can be rejected');
        }

        return prisma.$transaction(async (tx) => {
            const updated = await tx.vendor.update({
                where: { id },
                data: {
                    status,
                    rejectionReason: status === 'APPROVED' ? null : reason ?? null,
                    approvedAt: status === 'APPROVED' ? new Date() : vendor.approvedAt,
                },
            });
            if (status === 'APPROVED') {
                await tx.user.update({ where: { id: vendor.userId }, data: { role: Role.VENDOR } });
            } else if (status === 'REJECTED') {
                await tx.user.update({ where: { id: vendor.userId }, data: { role: Role.USER } });
            }
            const message = {
                APPROVED: { title: `${vendor.shopName} is approved`, body: 'You can now add products.', link: '/dashboard/vendor' },
                REJECTED: { title: `Your application for ${vendor.shopName} was not approved`, body: reason, link: '/dashboard/user/sell' },
                SUSPENDED: { title: `${vendor.shopName} was suspended`, body: reason, link: '/dashboard/vendor' },
            }[status];
            await notify(tx, { userId: vendor.userId, ...message });
            return updated;
        });
    },

    setCommission: async (id: number, commissionRate: number | null) =>
        prisma.vendor.update({ where: { id }, data: { commissionRate } }),

    getVendorStats: async (vendorId: number, requester: { id: number; role: Role; }) => {
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
        if (requester.role === Role.VENDOR && vendor.userId !== requester.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
        }

        const [totalProducts, totalOrders, revenue, avgRating] = await Promise.all([
            prisma.product.count({ where: { vendorId } }),
            prisma.vendorOrder.count({ where: { vendorId } }),
            prisma.vendorOrder.aggregate({ where: { vendorId, status: 'DELIVERED' }, _sum: { total: true } }),
            prisma.review.aggregate({ where: { product: { vendorId } }, _avg: { rating: true } }),
        ]);

        return {
            vendorId,
            totalProducts,
            totalOrders,
            totalRevenue: revenue._sum.total || 0,
            avgRating: avgRating._avg.rating || 0,
        };
    },

    getVendorProducts: async (vendorId: number, page = 1, limit = 10) => {
        await VendorService.getOne(vendorId);
        const where: Prisma.ProductWhereInput = { vendorId, isPublished: true, isBlocked: false };
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
                include: { categories: { include: { category: true } } },
            }),
            prisma.product.count({ where }),
        ]);
        return paginated(products, page, limit, total);
    },

    remove: async (id: number) => {
        await VendorService.setStatus(id, 'SUSPENDED', 'Deactivated by admin');
        return { message: 'Vendor deactivated successfully' };
    },
};
