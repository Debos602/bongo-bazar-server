import { Request, Response } from 'express';
import { AddressService } from './address.service';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';

const create = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const address = await AddressService.create(userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Address created',
        data: address,
    });
});

const list = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const addresses = await AddressService.list(userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Addresses fetched',
        data: addresses,
    });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const address = await AddressService.getOne(id, userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Address fetched',
        data: address,
    });
});

const updateOne = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const address = await AddressService.update(id, userId, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Address updated',
        data: address,
    });
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    await AddressService.remove(id, userId);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Address deleted',
        data: null,
    });
});

export const AddressController = { create, list, getOne, updateOne, remove };