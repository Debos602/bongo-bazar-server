"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRoutes = void 0;
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const category_controller_1 = require("./category.controller");
const category_validation_1 = require("./category.validation");
const router = express_1.default.Router();
// Get all categories - accessible to VENDOR and ADMIN
router.get('/', category_controller_1.categoryController.getAllCategories);
// get category by slug - accessible to VENDOR and ADMIN
router.get('/slug/:slug', 
// auth(Role.ADMIN, Role.VENDOR, Role.USER),
category_controller_1.categoryController.getCategoryBySlug);
// Get category by id - accessible to VENDOR and ADMIN
router.get('/:id', (0, auth_1.default)(client_1.Role.ADMIN, client_1.Role.VENDOR, client_1.Role.USER), category_controller_1.categoryController.getCategoryById);
// Create category - only ADMIN
router.post('/', (0, auth_1.default)(client_1.Role.ADMIN), (0, validateRequest_1.default)(category_validation_1.categoryValidation.create), category_controller_1.categoryController.createCategory);
// Update category - only ADMIN
router.patch('/:id', (0, auth_1.default)(client_1.Role.ADMIN), (0, validateRequest_1.default)(category_validation_1.categoryValidation.update), category_controller_1.categoryController.updateCategory);
// Delete category - only ADMIN
router.delete('/:id', (0, auth_1.default)(client_1.Role.ADMIN), category_controller_1.categoryController.deleteCategory);
exports.categoryRoutes = router;
