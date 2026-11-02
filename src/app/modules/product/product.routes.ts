import express from 'express';
import { Role } from '@prisma/client';
import { fileUploader } from '../../../helpers/fileUploader';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { productController } from './product.controller';
import { productValidation } from './product.validation';

const router = express.Router();
const admins = [Role.ADMIN, Role.SUPER_ADMIN];
const uploads = fileUploader.uploadMemory.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 },
]);

// Public
router.get('/', productController.listProducts);
router.get('/slug/:slug', productController.getBySlug);

// Dashboards (before /:id)
router.get('/mine', auth(Role.VENDOR), productController.listMine);
router.get('/manage/:id', auth(Role.VENDOR, ...admins), productController.getMine);
router.get('/admin/all', auth(...admins), productController.adminList);

router.get('/:id', productController.getProduct);

router.post('/', auth(Role.VENDOR), uploads, productController.createProduct);
router.put('/:id', auth(Role.VENDOR, ...admins), uploads, productController.updateProduct);
router.patch('/:id/moderate', auth(...admins), validateRequest(productValidation.moderate), productController.moderate);
router.delete('/:id', auth(Role.VENDOR, ...admins), productController.deleteProduct);

export const ProductRoutes = router;

export default ProductRoutes;
