import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import { VendorService } from './vendor.service';

const createVendor = catchAsync(async (req: Request & { user?: any; }, res: Response) => {
    const userId = req.user?.id;
    const { shopName } = req.body;

    if (!userId) {
        return sendResponse(res, {
            statusCode: httpStatus.UNAUTHORIZED,
            success: false,
            message: 'User not authenticated',
            data: null
        });
    }

    if (!shopName) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Shop name is required',
            data: null
        });
    }

    const vendor = await VendorService.create(userId, shopName);

    return sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Vendor created successfully',
        data: vendor
    });
});

const listVendors = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await VendorService.list(page, limit);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendors retrieved successfully',
        data: result
    });
});

const getVendor = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const vendor = await VendorService.getOne(id);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendor retrieved successfully',
        data: vendor
    });
});

const getMyVendorProfile = catchAsync(async (req: Request & { user?: any; }, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return sendResponse(res, {
            statusCode: httpStatus.UNAUTHORIZED,
            success: false,
            message: 'User not authenticated',
            data: null
        });
    }

    const vendor = await VendorService.getByUserId(userId);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendor profile retrieved successfully',
        data: vendor
    });
});

const updateVendor = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { shopName } = req.body;

    if (!shopName) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Shop name is required',
            data: null
        });
    }

    const vendor = await VendorService.update(id, { shopName });

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendor updated successfully',
        data: vendor
    });
});

const getVendorStats = catchAsync(async (req: Request, res: Response) => {
    const vendorId = parseInt(req.params.id);

    const stats = await VendorService.getVendorStats(vendorId);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendor statistics retrieved successfully',
        data: stats
    });
});

const getVendorProducts = catchAsync(async (req: Request, res: Response) => {
    const vendorId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await VendorService.getVendorProducts(vendorId, page, limit);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendor products retrieved successfully',
        data: result
    });
});

const searchVendors = catchAsync(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Search query is required',
            data: null
        });
    }

    const result = await VendorService.search(query, page, limit);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Vendors searched successfully',
        data: result
    });
});

const deleteVendor = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const result = await VendorService.remove(id);

    return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null
    });
});

export const VendorController = {
    createVendor,
    listVendors,
    getVendor,
    getMyVendorProfile,
    updateVendor,
    getVendorStats,
    getVendorProducts,
    searchVendors,
    deleteVendor
};
