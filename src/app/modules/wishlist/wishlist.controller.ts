import { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { WishlistService } from './wishlist.service';

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

export const WishlistController = {
    create: catchAsync(async (req: any, res) => ok(res, 'Added to wishlist', await WishlistService.add(req.user.id, Number(req.body.productId)), httpStatus.CREATED)),
    list: catchAsync(async (req: any, res) => ok(res, 'Wishlist fetched', await WishlistService.list(req.user.id))),
    remove: catchAsync(async (req: any, res) => {
        await WishlistService.remove(Number(req.params.id), req.user.id);
        ok(res, 'Deleted', null);
    }),
    clear: catchAsync(async (req: any, res) => {
        await WishlistService.clear(req.user.id);
        ok(res, 'Wishlist cleared', null);
    }),
    removeByProduct: catchAsync(async (req: any, res) => {
        await WishlistService.removeByProduct(Number(req.params.productId), req.user.id);
        ok(res, 'Deleted', null);
    }),
};
