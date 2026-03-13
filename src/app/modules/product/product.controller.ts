import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import { productService } from './product.service';
import { fileUploader } from '../../../helpers/fileUploader';
import { VendorService } from '../vendor/vendor.service';
import pick from '../../../shared/pick';
import { productFilterableFields } from './product.constant';

// Helper to process optional files and attach image urls to payload
const attachFiles = async (req: Request, data: any) => {
    const files: Express.Multer.File[] = [];

    // Handle single file from upload.single()
    if ((req as any).file) {
        files.push((req as any).file);
    }

    // Handle multiple files from upload.fields() - structure: { fieldname: [File, ...] }
    if ((req as any).files && typeof (req as any).files === 'object') {
        const filesObj = (req as any).files;
        for (const fieldName in filesObj) {
            if (Array.isArray(filesObj[fieldName])) {
                files.push(...filesObj[fieldName]);
            }
        }
    }

    if (!files.length) return data;

    data = { ...(data || {}) };
    for (const f of files) {
        const uploadResult: any = f.buffer
            ? await fileUploader.uploadBufferToCloudinary(f.buffer, f.originalname)
            : await fileUploader.uploadFilePathToCloudinary(f.path, f.originalname);

        if (f.fieldname === 'image') {
            data.image = uploadResult.secure_url;
        } else if (f.fieldname === 'images') {
            data.images = data.images ? [].concat(data.images, uploadResult.secure_url) : [uploadResult.secure_url];
        }
    }

    return data;
};

// Helper to parse FormData types (FormData sends everything as strings)
const parseFormData = (data: any) => {
    const parsed = { ...data };

    // Convert numeric strings to numbers
    if (parsed.price !== undefined && parsed.price !== '') {
        parsed.price = parseFloat(parsed.price);
    }
    if (parsed.oldPrice !== undefined && parsed.oldPrice !== '') {
        parsed.oldPrice = parseFloat(parsed.oldPrice);
    }
    if (parsed.discount !== undefined && parsed.discount !== '') {
        parsed.discount = parseInt(parsed.discount, 10);
    }
    if (parsed.stock !== undefined && parsed.stock !== '') {
        parsed.stock = parseInt(parsed.stock, 10);
    }

    // Convert boolean strings to booleans
    if (parsed.isFeatured !== undefined) {
        parsed.isFeatured = parsed.isFeatured === 'true' || parsed.isFeatured === true;
    }
    if (parsed.isPublished !== undefined) {
        parsed.isPublished = parsed.isPublished === 'true' || parsed.isPublished === true;
    }

    // Remove empty image entries from array
    if (Array.isArray(parsed.images)) {
        parsed.images = parsed.images.filter((img: string) => img && img.trim());
    }

    return parsed;
};

const create = catchAsync(async (req: Request & { user?: any; }, res: Response) => {
    let data: any = { ...(req.body || {}) };
    data = await attachFiles(req, data);
    data = parseFormData(data);

    const userId = req.user?.id;
    const vendor = await VendorService.getByUserId(userId);

    const created = await productService.create(data, vendor.id);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Product created',
        data: created
    });
});

const list = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, productFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const result = await productService.list(filters, options);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Products listed',
        meta: result.meta,
        data: result.data
    });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await productService.getOne(id);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product fetched', data: item });
});

const updateOne = catchAsync(async (req: Request & { user?: any; }, res: Response) => {
    const id = Number(req.params.id);
    console.log("id", id);
    let data: any = { ...(req.body || {}) };
    data = await attachFiles(req, data);
    data = parseFormData(data);

    const updated = await productService.update(id, data, { id: req.user?.id, role: req.user?.role });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product updated', data: updated });
});

const remove = catchAsync(async (_req: Request, res: Response) => {
    const id = Number((_req as any).params.id);
    const result = await productService.remove(id);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Product deleted', data: result });
});

// Backwards-compatible names used by other modules
export const productController = {
    createProduct: create,
    updateProduct: updateOne,
    deleteProduct: remove,
    getProduct: getOne,
    listProducts: list,
    // also provide new-style names
    create,
    list,
    getOne,
    updateOne,
    remove,
};

export default productController;
