"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRoutes = void 0;
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("./order.controller");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const router = express_1.default.Router();
// ✅ নতুন route
router.post('/with-address', authMiddleware_1.default.authenticate, order_controller_1.OrderController.createWithAddress); // Cart থেকে
router.post('/direct', authMiddleware_1.default.authenticate, order_controller_1.OrderController.createDirect); // Buy Now
router.get('/', authMiddleware_1.default.authenticate, order_controller_1.OrderController.list);
router.get('/:id', authMiddleware_1.default.authenticate, order_controller_1.OrderController.getOne);
router.patch('/:id/status', authMiddleware_1.default.authenticate, order_controller_1.OrderController.updateStatus);
router.delete('/:id', authMiddleware_1.default.authenticate, order_controller_1.OrderController.remove);
exports.OrderRoutes = router;
