import { Response } from "express";
import httpStatus from 'http-status';
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CartService } from "./cart.service";

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

export const CartController = {
    create: catchAsync(async (req: any, res) => {
        const { productId, quantity } = req.body;
        ok(res, 'Added to cart', await CartService.create({ productId, quantity, userId: req.user.id }), httpStatus.CREATED);
    }),
    list: catchAsync(async (req: any, res) => {
        ok(res, 'Cart retrieved', await CartService.list(req.user.id));
    }),
    getOne: catchAsync(async (req: any, res) => {
        ok(res, 'Cart item retrieved', await CartService.getOne(Number(req.params.id), req.user.id));
    }),
    updateOne: catchAsync(async (req: any, res) => {
        ok(res, 'Cart item updated', await CartService.update(Number(req.params.id), req.user.id, req.body));
    }),
    remove: catchAsync(async (req: any, res) => {
        await CartService.remove(Number(req.params.id), req.user.id);
        ok(res, 'Deleted successfully', null);
    }),
    getCartCount: catchAsync(async (req: any, res) => {
        ok(res, 'Cart count retrieved successfully', await CartService.getCartCount(req.user.id));
    }),
};
