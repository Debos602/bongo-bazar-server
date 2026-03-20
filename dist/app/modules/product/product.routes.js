"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("./product.controller");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const fileUploader_1 = require("../../../helpers/fileUploader");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// Public
router.get('/', product_controller_1.productController.listProducts);
router.get('/:id', product_controller_1.productController.getProduct);
// Protected: vendor creates product with file upload
router.post('/', authMiddleware_1.default.authenticate, authMiddleware_1.default.authorize(client_1.Role.VENDOR), fileUploader_1.fileUploader.uploadMemory.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), product_controller_1.productController.createProduct);
// Protected: vendor owner or admin updates with optional file upload
router.put('/:id', authMiddleware_1.default.authenticate, authMiddleware_1.default.authorize(client_1.Role.VENDOR, client_1.Role.ADMIN), fileUploader_1.fileUploader.uploadMemory.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), product_controller_1.productController.updateProduct);
// Protected: admin only delete
router.delete('/:id', authMiddleware_1.default.authenticate, authMiddleware_1.default.authorize(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN), product_controller_1.productController.deleteProduct);
exports.productRoutes = router;
exports.default = exports.productRoutes;
