import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { fileUploader } from '../../../helpers/fileUploader';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PostService } from './post.service';

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

const withThumbnail = async (req: Request) => {
    const data: any = { ...(req.body || {}) };
    if (req.file) {
        data.thumbnail = (await fileUploader.uploadBufferToCloudinary(req.file.buffer, req.file.originalname)).secure_url;
    }
    return data;
};

export const PostController = {
    create: catchAsync(async (req: any, res) => ok(res, 'Post created', await PostService.create(await withThumbnail(req), req.user), httpStatus.CREATED)),
    list: catchAsync(async (req, res) => ok(res, 'Posts fetched', await PostService.list())),
    getOne: catchAsync(async (req, res) => ok(res, 'Post fetched', await PostService.getOne(Number(req.params.id)))),
    updateOne: catchAsync(async (req: any, res) => ok(res, 'Post updated', await PostService.update(Number(req.params.id), await withThumbnail(req), req.user))),
    remove: catchAsync(async (req: any, res) => {
        await PostService.remove(Number(req.params.id), req.user);
        ok(res, 'Deleted', null);
    }),
};
