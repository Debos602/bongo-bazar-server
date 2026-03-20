"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const product_service_1 = require("./product.service");
const fileUploader_1 = require("../../../helpers/fileUploader");
const vendor_service_1 = require("../vendor/vendor.service");
const pick_1 = __importDefault(require("../../../shared/pick"));
const product_constant_1 = require("./product.constant");
// Helper to process optional files and attach image urls to payload
const attachFiles = (req, data) => __awaiter(void 0, void 0, void 0, function* () {
    const files = [];
    // Handle single file from upload.single()
    if (req.file) {
        files.push(req.file);
    }
    // Handle multiple files from upload.fields() - structure: { fieldname: [File, ...] }
    if (req.files && typeof req.files === 'object') {
        const filesObj = req.files;
        for (const fieldName in filesObj) {
            if (Array.isArray(filesObj[fieldName])) {
                files.push(...filesObj[fieldName]);
            }
        }
    }
    if (!files.length)
        return data;
    data = Object.assign({}, (data || {}));
    for (const f of files) {
        const uploadResult = f.buffer
            ? yield fileUploader_1.fileUploader.uploadBufferToCloudinary(f.buffer, f.originalname)
            : yield fileUploader_1.fileUploader.uploadFilePathToCloudinary(f.path, f.originalname);
        if (f.fieldname === 'image') {
            data.image = uploadResult.secure_url;
        }
        else if (f.fieldname === 'images') {
            data.images = data.images ? [].concat(data.images, uploadResult.secure_url) : [uploadResult.secure_url];
        }
    }
    return data;
});
// Helper to parse FormData types (FormData sends everything as strings)
const parseFormData = (data) => {
    const parsed = Object.assign({}, data);
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
        parsed.images = parsed.images.filter((img) => img && img.trim());
    }
    return parsed;
};
const create = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let data = Object.assign({}, (req.body || {}));
    data = yield attachFiles(req, data);
    data = parseFormData(data);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const vendor = yield vendor_service_1.VendorService.getByUserId(userId);
    const created = yield product_service_1.productService.create(data, vendor.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Product created',
        data: created
    });
}));
const list = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = (0, pick_1.default)(req.query, product_constant_1.productFilterableFields);
    const options = (0, pick_1.default)(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = yield product_service_1.productService.list(filters, options);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Products listed',
        meta: result.meta,
        data: result.data
    });
}));
const getOne = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const item = yield product_service_1.productService.getOne(id);
    (0, sendResponse_1.default)(res, { statusCode: http_status_1.default.OK, success: true, message: 'Product fetched', data: item });
}));
const updateOne = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const id = Number(req.params.id);
    console.log("id", id);
    let data = Object.assign({}, (req.body || {}));
    data = yield attachFiles(req, data);
    data = parseFormData(data);
    const updated = yield product_service_1.productService.update(id, data, { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id, role: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role });
    (0, sendResponse_1.default)(res, { statusCode: http_status_1.default.OK, success: true, message: 'Product updated', data: updated });
}));
const remove = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(_req.params.id);
    const result = yield product_service_1.productService.remove(id);
    (0, sendResponse_1.default)(res, { statusCode: http_status_1.default.OK, success: true, message: 'Product deleted', data: result });
}));
// Backwards-compatible names used by other modules
exports.productController = {
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
exports.default = exports.productController;
