"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorRoutes = void 0;
const express_1 = __importDefault(require("express"));
const vendor_controller_1 = require("./vendor.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// Public static routes (সবার আগে)
router.get('/', vendor_controller_1.VendorController.listVendors);
router.get('/search', vendor_controller_1.VendorController.searchVendors);
// Protected static routes (dynamic /:id এর আগে)
router.post('/', (0, auth_1.default)(client_1.Role.USER, client_1.Role.VENDOR), vendor_controller_1.VendorController.createVendor);
router.get('/profile/me', (0, auth_1.default)(client_1.Role.VENDOR), vendor_controller_1.VendorController.getMyVendorProfile);
// Public dynamic routes (সবার শেষে)
router.get('/:id', vendor_controller_1.VendorController.getVendor);
router.get('/:id/products', vendor_controller_1.VendorController.getVendorProducts);
router.get('/:id/stats', vendor_controller_1.VendorController.getVendorStats);
// Protected dynamic routes
router.patch('/:id', (0, auth_1.default)(client_1.Role.VENDOR, client_1.Role.ADMIN), vendor_controller_1.VendorController.updateVendor);
router.delete('/:id', (0, auth_1.default)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN), vendor_controller_1.VendorController.deleteVendor);
exports.VendorRoutes = router;
