import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';

const createWithAddress = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const { fullName, phone, city, area, address, postalCode, couponCode } = req.body;

    const order = await OrderService.createWithAddress(
        userId,
        { fullName, phone, city, area, address, postalCode },
        couponCode
    );

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Order placed successfully',
        data: order,
    });
});



// ✅ Buy Now (single product)
const createDirect = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const { addressId, productId, quantity, couponCode } = req.body;

    const order = await OrderService.createDirect(
        userId, addressId, productId, quantity, couponCode
    );

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Order placed successfully',
        data: order,
    });
});

const list = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const orders = await OrderService.list(userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Orders fetched',
        data: orders,
    });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const order = await OrderService.getOne(id, userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Order fetched',
        data: order,
    });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const order = await OrderService.updateStatus(id, status);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Status updated',
        data: order,
    });
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await OrderService.remove(id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Order deleted',
        data: null,
    });
});

export const OrderController = {
    createWithAddress,
    createDirect,
    list,
    getOne,
    updateStatus,
    remove,
};