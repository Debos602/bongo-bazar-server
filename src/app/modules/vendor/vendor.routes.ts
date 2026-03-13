import express from 'express';
import { VendorController } from './vendor.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';

const router = express.Router();

// Public static routes (সবার আগে)
router.get('/', VendorController.listVendors);
router.get('/search', VendorController.searchVendors);

// Protected static routes (dynamic /:id এর আগে)
router.post(
    '/',
    auth(Role.USER, Role.VENDOR),
    VendorController.createVendor
);

router.get(
    '/profile/me',
    auth(Role.VENDOR),
    VendorController.getMyVendorProfile
);

// Public dynamic routes (সবার শেষে)
router.get('/:id', VendorController.getVendor);
router.get('/:id/products', VendorController.getVendorProducts);
router.get('/:id/stats', VendorController.getVendorStats);

// Protected dynamic routes
router.patch(
    '/:id',
    auth(Role.VENDOR, Role.ADMIN),
    VendorController.updateVendor
);

router.delete(
    '/:id',
    auth(Role.ADMIN, Role.SUPER_ADMIN),
    VendorController.deleteVendor
);

export const VendorRoutes = router;