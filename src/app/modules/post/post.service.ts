import { Role } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../errors/ApiError';

type Requester = { id: number; role: Role; };
const author = { select: { id: true, name: true, picture: true } };

// Multipart forms send strings; keep only the fields a client may set.
const clean = (data: any, requester: Requester) => {
    const result: any = {};
    if (data.title !== undefined) result.title = String(data.title);
    if (data.content !== undefined) result.content = String(data.content);
    if (data.thumbnail !== undefined) result.thumbnail = data.thumbnail;
    if (data.tags !== undefined) {
        result.tags = Array.isArray(data.tags) ? data.tags : String(data.tags).split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (data.isFeatured !== undefined && requester.role !== Role.VENDOR) {
        result.isFeatured = data.isFeatured === true || data.isFeatured === 'true';
    }
    return result;
};

const assertCanEdit = async (id: number, requester: Requester) => {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
    if (requester.role === Role.VENDOR && post.authorId !== requester.id) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only manage your own posts');
    }
};

export const PostService = {
    create: async (data: any, requester: Requester) => {
        const payload = clean(data, requester);
        if (!payload.title || !payload.content) throw new ApiError(httpStatus.BAD_REQUEST, 'Title and content are required');
        return prisma.post.create({ data: { ...payload, authorId: requester.id } });
    },
    list: async () => prisma.post.findMany({ include: { author }, orderBy: { createdAt: 'desc' } }),
    getOne: async (id: number) => {
        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
        return prisma.post.update({ where: { id }, data: { views: { increment: 1 } }, include: { author } });
    },
    update: async (id: number, data: any, requester: Requester) => {
        await assertCanEdit(id, requester);
        return prisma.post.update({ where: { id }, data: clean(data, requester) });
    },
    remove: async (id: number, requester: Requester) => {
        await assertCanEdit(id, requester);
        await prisma.post.delete({ where: { id } });
    },
};
