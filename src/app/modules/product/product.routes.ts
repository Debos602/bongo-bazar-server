import express from 'express';
import { productController } from './product.controller';
import authMiddleware from '../../middlewares/authMiddleware';
import { fileUploader } from '../../../helpers/fileUploader';
import { Role } from '@prisma/client';

const router = express.Router();

// Public
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

// Protected: vendor creates product with file upload
router.post(
    '/',
    authMiddleware.authenticate,
    authMiddleware.authorize(Role.VENDOR),
    fileUploader.uploadMemory.fields([
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 5 }
    ]),
    productController.createProduct
);

// Protected: vendor owner or admin updates with optional file upload
router.put(
    '/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(Role.VENDOR, Role.ADMIN),
    fileUploader.uploadMemory.fields([
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 5 }
    ]),
    productController.updateProduct
);

// Protected: admin only delete
router.delete('/:id', authMiddleware.authenticate, authMiddleware.authorize(Role.ADMIN, Role.SUPER_ADMIN), productController.deleteProduct);

export const productRoutes = router;

export default productRoutes;

