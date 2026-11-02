import { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CouponService } from './coupon.service';

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

export const CouponController = {
    create: catchAsync(async (req: any, res) => ok(res, 'Coupon created', await CouponService.create(req.body, req.user), httpStatus.CREATED)),
    list: catchAsync(async (req: any, res) => ok(res, 'Coupons fetched', await CouponService.list(req.user))),
    getOne: catchAsync(async (req: any, res) => ok(res, 'Coupon fetched', await CouponService.getOne(Number(req.params.id), req.user))),
    updateOne: catchAsync(async (req: any, res) => ok(res, 'Coupon updated', await CouponService.update(Number(req.params.id), req.body, req.user))),
    remove: catchAsync(async (req: any, res) => {
        await CouponService.remove(Number(req.params.id), req.user);
        ok(res, 'Deleted', null);
    }),
    validate: catchAsync(async (req: any, res) => ok(res, 'Coupon is valid', await CouponService.validate(req.body.code, req.user.id))),
};
