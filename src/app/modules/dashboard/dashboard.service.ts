import prisma from '../../../shared/prisma';
import { getBalance } from '../payout/payout.service';
import { VendorService } from '../vendor/vendor.service';

const LOW_STOCK = 5;

const countBy = <K extends string>(rows: { _count: unknown; }[], key: K) =>
    Object.fromEntries(rows.map((r: any) => [r[key], r._count])) as Record<string, number>;

// Last 12 months, oldest first, with empty months filled in.
const fillMonths = (rows: { month: string; revenue: number; orders: number; }[]) => {
    const byMonth = new Map(rows.map((r) => [r.month, r]));
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const month = d.toISOString().slice(0, 7);
        const row = byMonth.get(month);
        result.push({ month, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) });
    }
    return result;
};

const monthlySales = async (vendorId?: number) => {
    const filter = vendorId ? `AND "vendorId" = ${Number(vendorId)}` : '';
    const rows = await prisma.$queryRawUnsafe<{ month: string; revenue: number; orders: number; }[]>(`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               COALESCE(SUM("total"), 0)::float AS revenue,
               COUNT(*)::int AS orders
        FROM "VendorOrder"
        WHERE "status" <> 'CANCELLED' AND "createdAt" >= date_trunc('month', now()) - interval '11 months' ${filter}
        GROUP BY 1`);
    return fillMonths(rows);
};

const topProducts = async (vendorId?: number) => {
    const rows = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: { vendorOrder: { status: { not: 'CANCELLED' }, ...(vendorId ? { vendorId } : {}) } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
    });
    const products = await prisma.product.findMany({
        where: { id: { in: rows.map((r) => r.productId) } },
        select: { id: true, name: true, image: true, price: true },
    });
    return rows.map((r) => ({ ...products.find((p) => p.id === r.productId), sold: r._sum.quantity ?? 0 }));
};

export const DashboardService = {
    admin: async () => {
        const [users, vendors, orders, productTotal, sales, delivered, pendingPayouts, recentOrders, pendingVendors, monthly, top] = await Promise.all([
            prisma.user.groupBy({ by: ['role'], _count: true }),
            prisma.vendor.groupBy({ by: ['status'], _count: true }),
            prisma.order.groupBy({ by: ['status'], _count: true }),
            prisma.product.count(),
            prisma.vendorOrder.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { total: true } }),
            prisma.vendorOrder.aggregate({ where: { status: 'DELIVERED' }, _sum: { commissionAmount: true, platformDiscount: true } }),
            prisma.payout.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
            prisma.order.findMany({
                take: 8, orderBy: { createdAt: 'desc' },
                select: { id: true, total: true, status: true, createdAt: true, user: { select: { name: true } }, address: { select: { city: true } } },
            }),
            prisma.vendor.findMany({
                where: { status: 'PENDING' }, take: 5, orderBy: { createdAt: 'asc' },
                select: { id: true, shopName: true, createdAt: true, user: { select: { name: true, email: true } } },
            }),
            monthlySales(),
            topProducts(),
        ]);
        const userCounts = countBy(users, 'role');
        return {
            totals: {
                users: Object.values(userCounts).reduce((a, b) => a + b, 0),
                customers: userCounts.USER ?? 0,
                products: productTotal,
                orders: Object.values(countBy(orders, 'status')).reduce((a, b) => a + b, 0),
                sales: sales._sum.total ?? 0,
                commissionEarned: delivered._sum.commissionAmount ?? 0,
                platformDiscounts: delivered._sum.platformDiscount ?? 0,
                pendingPayoutAmount: pendingPayouts._sum.amount ?? 0,
                pendingPayoutCount: pendingPayouts._count,
            },
            vendorsByStatus: countBy(vendors, 'status'),
            ordersByStatus: countBy(orders, 'status'),
            monthlySales: monthly,
            topProducts: top,
            recentOrders,
            pendingVendors,
        };
    },

    vendor: async (userId: number) => {
        const vendor = await VendorService.getByUserId(userId);
        const vendorId = vendor.id;
        const [products, published, orders, sales, balance, rating, lowStock, recentOrders, monthly, top] = await Promise.all([
            prisma.product.count({ where: { vendorId } }),
            prisma.product.count({ where: { vendorId, isPublished: true, isBlocked: false } }),
            prisma.vendorOrder.groupBy({ by: ['status'], where: { vendorId }, _count: true }),
            prisma.vendorOrder.aggregate({ where: { vendorId, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
            getBalance(prisma, vendorId),
            prisma.review.aggregate({ where: { product: { vendorId } }, _avg: { rating: true }, _count: true }),
            prisma.product.findMany({
                where: { vendorId, stock: { lte: LOW_STOCK }, isPublished: true }, take: 5, orderBy: { stock: 'asc' },
                select: { id: true, name: true, image: true, stock: true },
            }),
            prisma.vendorOrder.findMany({
                where: { vendorId }, take: 8, orderBy: { createdAt: 'desc' },
                select: { id: true, orderId: true, total: true, vendorEarning: true, status: true, createdAt: true, order: { select: { user: { select: { name: true } }, address: { select: { city: true } } } } },
            }),
            monthlySales(vendorId),
            topProducts(vendorId),
        ]);
        const ordersByStatus = countBy(orders, 'status');
        return {
            shop: { id: vendor.id, shopName: vendor.shopName, slug: vendor.slug, status: vendor.status, commissionRate: vendor.commissionRate },
            totals: {
                products,
                publishedProducts: published,
                orders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
                sales: sales._sum.total ?? 0,
                averageRating: rating._avg.rating ?? 0,
                reviews: rating._count,
            },
            balance,
            ordersByStatus,
            monthlySales: monthly,
            topProducts: top,
            lowStock,
            recentOrders,
        };
    },

    user: async (userId: number) => {
        const [orders, spent, wishlist, addresses, reviews, recentOrders, vendor, toReview] = await Promise.all([
            prisma.order.groupBy({ by: ['status'], where: { userId }, _count: true }),
            prisma.order.aggregate({ where: { userId, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
            prisma.wishlist.count({ where: { userId } }),
            prisma.address.count({ where: { userId } }),
            prisma.review.count({ where: { userId } }),
            prisma.order.findMany({
                where: { userId }, take: 5, orderBy: { createdAt: 'desc' },
                select: { id: true, total: true, status: true, createdAt: true, _count: { select: { items: true } }, payment: { select: { method: true, status: true } } },
            }),
            prisma.vendor.findUnique({ where: { userId }, select: { id: true, shopName: true, status: true, rejectionReason: true } }),
            prisma.product.findMany({
                where: {
                    orderItems: { some: { order: { userId }, vendorOrder: { status: 'DELIVERED' } } },
                    reviews: { none: { userId } },
                },
                take: 10,
                select: { id: true, name: true, image: true },
            }),
        ]);
        const ordersByStatus = countBy(orders, 'status');
        return {
            totals: {
                orders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
                spent: spent._sum.total ?? 0,
                wishlist,
                addresses,
                reviews,
            },
            ordersByStatus,
            recentOrders,
            vendorApplication: vendor,
            toReview,
        };
    },
};
