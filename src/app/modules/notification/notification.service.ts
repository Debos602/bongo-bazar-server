import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';

export type NewNotification = { userId: number; title: string; body?: string; link?: string; };
type Client = Prisma.TransactionClient | typeof prisma;

// Pass the transaction client, so a notification exists only if the event it describes was saved.
export const notify = async (client: Client, rows: NewNotification | NewNotification[]) => {
    const data = Array.isArray(rows) ? rows : [rows];
    if (data.length) await client.notification.createMany({ data });
};

export const notifyAdmins = async (client: Client, row: Omit<NewNotification, 'userId'>) => {
    const admins = await client.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
    });
    await notify(client, admins.map((a) => ({ ...row, userId: a.id })));
};

export const NotificationService = {
    list: async (userId: number, limit: number) => {
        const [items, unread] = await Promise.all([
            prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }),
            prisma.notification.count({ where: { userId, readAt: null } }),
        ]);
        return { items, unread };
    },
    unreadCount: async (userId: number) => ({
        unread: await prisma.notification.count({ where: { userId, readAt: null } }),
    }),
    markRead: async (id: number, userId: number) => {
        const { count } = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
        if (!count && !(await prisma.notification.findFirst({ where: { id, userId } }))) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
        }
    },
    markAllRead: async (userId: number) => {
        await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    },
};
