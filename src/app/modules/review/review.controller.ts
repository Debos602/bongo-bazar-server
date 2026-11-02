import { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ReviewService } from './review.service';

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

export const ReviewController = {
    create: catchAsync(async (req: any, res) => ok(res, 'Review added', await ReviewService.create(req.user.id, req.body), httpStatus.CREATED)),
    list: catchAsync(async (req, res) => {
        const result = await ReviewService.list({
            productId: req.query.productId ? Number(req.query.productId) : undefined,
            page: Number(req.query.page) || 1,
            limit: Math.min(Number(req.query.limit) || 10, 100),
        });
        sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reviews fetched', meta: result.meta, data: result.data });
    }),
    mine: catchAsync(async (req: any, res) => ok(res, 'Your reviews', await ReviewService.mine(req.user.id))),
    forVendor: catchAsync(async (req: any, res) => ok(res, 'Reviews on your products', await ReviewService.forVendor(req.user.id))),
    getOne: catchAsync(async (req, res) => ok(res, 'Review fetched', await ReviewService.getOne(Number(req.params.id)))),
    updateOne: catchAsync(async (req: any, res) => ok(res, 'Review updated', await ReviewService.update(Number(req.params.id), req.user.id, req.body))),
    remove: catchAsync(async (req: any, res) => {
        await ReviewService.remove(Number(req.params.id), req.user);
        ok(res, 'Deleted', null);
    }),
};
