import { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { OrderService } from './order.service';

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

export const OrderController = {
    createWithAddress: catchAsync(async (req: any, res) => {
        const { couponCode, paymentMethod, ...address } = req.body;
        ok(res, 'Order placed successfully', await OrderService.createWithAddress(req.user.id, address, couponCode, paymentMethod), httpStatus.CREATED);
    }),
    createDirect: catchAsync(async (req: any, res) => {
        const { addressId, productId, quantity, couponCode, paymentMethod } = req.body;
        ok(res, 'Order placed successfully', await OrderService.createDirect(req.user.id, addressId, productId, quantity, couponCode, paymentMethod), httpStatus.CREATED);
    }),
    list: catchAsync(async (req: any, res) => ok(res, 'Orders fetched', await OrderService.list(req.user.id))),
    getOne: catchAsync(async (req: any, res) => ok(res, 'Order fetched', await OrderService.getOne(Number(req.params.id), req.user.id))),
    cancelMine: catchAsync(async (req: any, res) => ok(res, 'Order cancelled', await OrderService.cancelMine(Number(req.params.id), req.user.id))),
    vendorList: catchAsync(async (req: any, res) => {
        const result = await OrderService.vendorList(req.user.id, req.query);
        sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Vendor orders fetched', meta: result.meta, data: result.data });
    }),
    vendorUpdateStatus: catchAsync(async (req: any, res) => {
        ok(res, 'Status updated', await OrderService.vendorUpdateStatus(Number(req.params.id), req.user.id, req.body.status, req.body.trackingNumber));
    }),
    adminList: catchAsync(async (req, res) => {
        const result = await OrderService.adminList(req.query);
        sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Orders fetched', meta: result.meta, data: result.data });
    }),
    adminGetOne: catchAsync(async (req, res) => ok(res, 'Order fetched', await OrderService.adminGetOne(Number(req.params.id)))),
    updateStatus: catchAsync(async (req, res) => ok(res, 'Status updated', await OrderService.updateStatus(Number(req.params.id), req.body.status))),
    remove: catchAsync(async (req, res) => {
        await OrderService.remove(Number(req.params.id));
        ok(res, 'Order deleted', null);
    }),
};
