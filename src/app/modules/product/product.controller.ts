import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { fileUploader } from '../../../helpers/fileUploader';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { VendorService } from '../vendor/vendor.service';
import { productFilterableFields } from './product.constant';
import { productService } from './product.service';
import { productValidation } from './product.validation';
import { Role } from '@prisma/client';

const CLEARABLE = ['description', 'oldPrice', 'discount', 'sku', 'badgeType'];

// Upload any attached files and put their URLs on the payload.
const attachFiles = async (req: Request, data: any) => {
    const groups = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
    if (!groups) return data;

    const result = { ...data };
    for (const file of groups.image ?? []) {
        result.image = (await fileUploader.uploadBufferToCloudinary(file.buffer, file.originalname)).secure_url;
    }
    const uploaded: string[] = [];
    for (const file of groups.images ?? []) {
        uploaded.push((await fileUploader.uploadBufferToCloudinary(file.buffer, file.originalname)).secure_url);
    }
    if (uploaded.length) {
        const existing = data.images ? [].concat(data.images) : [];
        result.images = [...existing, ...uploaded];
    }
    return result;
};

const options = (req: Request) => pick(req.query as any, ['limit', 'page', 'sortBy', 'sortOrder']);
const filters = (req: Request) => pick(req.query as any, productFilterableFields);

const create = catchAsync(async (req: any, res: Response) => {
    const vendor = req.user.role === Role.VENDOR
        ? await VendorService.getApprovedByUserId(req.user.id)
        : await productService.getShopForAdmin(req.body?.vendorId);
    // Validate before uploading, apart from image, which may arrive as a file.
    const data = productValidation.create.parse(await attachFiles(req, productValidation.update.parse(req.body)));
    const created = await productService.create(data, vendor.id);
    sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Product created', data: created });
});

const list = catchAsync(async (req: Request, res: Response) => {
    const result = await productService.list(filters(req), options(req));
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Products listed', meta: result.meta, data: result.data });
});

const listMine = catchAsync(async (req: any, res: Response) => {
    const result = await productService.listMine(req.user.id, filters(req), options(req));
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Your products', meta: result.meta, data: result.data });
});

const getMine = catchAsync(async (req: any, res: Response) => {
    const item = await productService.getMine(Number(req.params.id), req.user);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product fetched', data: item });
});

const adminList = catchAsync(async (req: Request, res: Response) => {
    const result = await productService.adminList(filters(req), options(req));
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'All products', meta: result.meta, data: result.data });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
    const item = await productService.getOne(Number(req.params.id));
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product fetched', data: item });
});

const getBySlug = catchAsync(async (req: Request, res: Response) => {
    const item = await productService.getBySlug(String(req.params.slug));
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product fetched', data: item });
});

const updateOne = catchAsync(async (req: any, res: Response) => {
    const data: any = productValidation.update.parse(await attachFiles(req, productValidation.update.parse(req.body)));
    // A field the form sent empty means "clear it".
    for (const key of CLEARABLE) {
        if (req.body?.[key] === '') data[key] = null;
    }
    if (req.body?.tags === '') data.tags = [];
    const updated = await productService.update(Number(req.params.id), data, req.user);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product updated', data: updated });
});

const moderate = catchAsync(async (req: Request, res: Response) => {
    const updated = await productService.moderate(Number(req.params.id), req.body);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product moderated', data: updated });
});

const remove = catchAsync(async (req: any, res: Response) => {
    const result = await productService.remove(Number(req.params.id), req.user);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.deleted ? 'Product deleted' : 'Product has past orders, so it was unpublished instead',
        data: result,
    });
});

export const productController = {
    createProduct: create,
    updateProduct: updateOne,
    deleteProduct: remove,
    getProduct: getOne,
    listProducts: list,
    create, list, listMine, getMine, adminList, getOne, getBySlug, updateOne, moderate, remove,
};

export default productController;
