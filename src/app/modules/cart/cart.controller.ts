import { NextFunction, Request, Response } from "express";
import { CartService } from "./cart.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from 'http-status';



const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user?.id;

        // ✅ userId না থাকলে আগেই error দাও
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const cart = await CartService.create({ productId, quantity, userId });

        sendResponse(res, {
            statusCode: httpStatus.CREATED,
            success: true,
            message: 'Cart created',
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

const list = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.user?.id); // ✅ JWT থেকে userId নিন

    if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }

    const items = await CartService.list(userId); // ✅ userId পাঠান

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "cart retrieved",
        data: items
    });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await CartService.getOne(id);

    res.json({
        success: true,
        data: item,
    });
});

const updateOne = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = { ...(req.body || {}) };

    const updated = await CartService.update(id, data);

    res.json({
        success: true,
        data: updated,
    });
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    await CartService.remove(id);

    res.json({
        success: true,
        message: "Deleted successfully",
    });
});
const getCartCount = async (req: Request, res: Response): Promise<void> => {
    const userId = Number(req.user?.id);

    if (!userId) {
        res.status(400).json({
            success: false,
            message: "userId query missing or invalid"
        });
        return;
    }

    try {
        const count = await CartService.getCartCount(userId);
        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Cart count retrieved successfully',
            data: count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error
        });
    }
};

export const CartController = { create, list, getOne, updateOne, remove, getCartCount };