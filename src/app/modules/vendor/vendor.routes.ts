import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { VendorController } from './vendor.controller';
import { vendorValidation } from './vendor.validation';

const router = express.Router();
const admins = [Role.ADMIN, Role.SUPER_ADMIN];

// Public
router.get('/', VendorController.listVendors);
router.get('/search', VendorController.searchVendors);
router.get('/shop/:slug', VendorController.getVendorBySlug);

// Admin
router.get('/admin/all', auth(...admins), VendorController.adminList);

// Applicant / vendor. USER is allowed so an applicant can see their application status.
router.post('/', auth(Role.USER), validateRequest(vendorValidation.apply), VendorController.createVendor);
router.get('/profile/me', auth(Role.USER, Role.VENDOR), VendorController.getMyVendorProfile);
router.patch('/profile/me', auth(Role.VENDOR), validateRequest(vendorValidation.update), VendorController.updateMyProfile);

// Public dynamic
router.get('/:id', VendorController.getVendor);
router.get('/:id/products', VendorController.getVendorProducts);

// Protected dynamic
router.get('/:id/stats', auth(Role.VENDOR, ...admins), VendorController.getVendorStats);
router.patch('/:id', auth(Role.VENDOR, ...admins), validateRequest(vendorValidation.update), VendorController.updateVendor);
router.patch('/:id/status', auth(...admins), validateRequest(vendorValidation.setStatus), VendorController.setStatus);
router.patch('/:id/commission', auth(...admins), validateRequest(vendorValidation.setCommission), VendorController.setCommission);
router.delete('/:id', auth(...admins), VendorController.deleteVendor);

export const VendorRoutes = router;
