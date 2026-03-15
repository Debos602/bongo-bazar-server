import { Role } from '@prisma/client';
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { categoryController } from './category.controller';
import { categoryValidation } from './category.validation';

const router = express.Router();

// Get all categories - accessible to VENDOR and ADMIN
router.get(
    '/',
    categoryController.getAllCategories
);
// get category by slug - accessible to VENDOR and ADMIN
router.get(
    '/slug/:slug',
    // auth(Role.ADMIN, Role.VENDOR, Role.USER),
    categoryController.getCategoryBySlug
);

// Get category by id - accessible to VENDOR and ADMIN
router.get(
    '/:id',
    auth(Role.ADMIN, Role.VENDOR, Role.USER),
    categoryController.getCategoryById
);



// Create category - only ADMIN
router.post(
    '/',
    auth(Role.ADMIN),
    validateRequest(categoryValidation.create),
    categoryController.createCategory
);

// Update category - only ADMIN
router.patch(
    '/:id',
    auth(Role.ADMIN),
    validateRequest(categoryValidation.update),
    categoryController.updateCategory
);

// Delete category - only ADMIN
router.delete(
    '/:id',
    auth(Role.ADMIN),
    categoryController.deleteCategory
);

export const categoryRoutes = router;
