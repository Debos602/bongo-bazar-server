import { PayoutStatus, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import { roundMoney } from '../../../shared/money';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';
import { notify, notifyAdmins } from '../notification/notification.service';
import { VendorService } from '../vendor/vendor.service';

// Earned on delivered orders, minus what is paid out or waiting to be.
export const getBalance = async (client: Prisma.TransactionClient | typeof prisma, vendorId: number) => {
    // Sequential: this also runs inside transactions, which handle one query at a time.
    const earned = await client.vendorOrder.aggregate({ where: { vendorId, status: 'DELIVERED' }, _sum: { vendorEarning: true } });
    const paid = await client.payout.aggregate({ where: { vendorId, status: PayoutStatus.PAID }, _sum: { amount: true } });
    const pending = await client.payout.aggregate({ where: { vendorId, status: PayoutStatus.PENDING }, _sum: { amount: true } });
    const totalEarned = earned._sum.vendorEarning ?? 0;
    const totalPaid = paid._sum.amount ?? 0;
    const pendingPayouts = pending._sum.amount ?? 0;
    return {
        totalEarned: roundMoney(totalEarned),
        totalPaid: roundMoney(totalPaid),
        pendingPayouts: roundMoney(pendingPayouts),
        available: roundMoney(totalEarned - totalPaid - pendingPayouts),
    };
};

export const PayoutService = {
    mine: async (userId: number) => {
        const vendor = await VendorService.getByUserId(userId);
        const [balance, payouts] = await Promise.all([
            getBalance(prisma, vendor.id),
            prisma.payout.findMany({ where: { vendorId: vendor.id }, orderBy: { createdAt: 'desc' } }),
        ]);
        return { balance, payouts };
    },

    request: async (userId: number, data: { amount: number; method: string; accountDetails: string; note?: string; }) => {
        const vendor = await VendorService.getApprovedByUserId(userId);
        return prisma.$transaction(async (tx) => {
            // Row lock, so two requests at once cannot both spend the same balance.
            await tx.$queryRaw`SELECT id FROM "Vendor" WHERE id = ${vendor.id} FOR UPDATE`;
            const balance = await getBalance(tx, vendor.id);
            if (data.amount > balance.available) {
                throw new ApiError(httpStatus.BAD_REQUEST, `You can withdraw up to ${balance.available}`);
            }
            const payout = await tx.payout.create({ data: { ...data, vendorId: vendor.id } });
            await notifyAdmins(tx, {
                title: 'New payout request',
                body: `${vendor.shopName} asked for ৳ ${data.amount}`,
                link: '/dashboard/admin/payouts?status=PENDING',
            });
            return payout;
        });
    },

    adminList: async (query: any) => {
        const page = Number(query.page) || 1;
        const limit = Math.min(Number(query.limit) || 20, 100);
        const status = Object.values(PayoutStatus).find((s) => s === query.status);
        const where: Prisma.PayoutWhereInput = status ? { status } : {};
        const [data, total] = await Promise.all([
            prisma.payout.findMany({
                where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
                include: { vendor: { select: { id: true, shopName: true, slug: true } } },
            }),
            prisma.payout.count({ where }),
        ]);
        return { meta: { page, limit, total }, data };
    },

    process: async (id: number, data: { status: 'PAID' | 'REJECTED'; transactionRef?: string; note?: string; }) => {
        return prisma.$transaction(async (tx) => {
            const { count } = await tx.payout.updateMany({
                where: { id, status: PayoutStatus.PENDING },
                data: { ...data, processedAt: new Date() },
            });
            if (!count) throw new ApiError(httpStatus.BAD_REQUEST, 'This payout is not pending');
            const payout = await tx.payout.findUniqueOrThrow({ where: { id }, include: { vendor: { select: { userId: true } } } });
            await notify(tx, {
                userId: payout.vendor.userId,
                title: data.status === 'PAID' ? `Your payout of ৳ ${payout.amount} was sent` : `Your payout of ৳ ${payout.amount} was rejected`,
                body: data.status === 'PAID' ? (data.transactionRef ? `Reference ${data.transactionRef}` : undefined) : data.note,
                link: '/dashboard/vendor/payouts',
            });
            const { vendor: _vendor, ...result } = payout;
            return result;
        });
    },
};
