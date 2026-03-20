"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartRoutes = void 0;
const express_1 = __importDefault(require("express"));
const cart_controller_1 = require("./cart.controller");
const client_1 = require("@prisma/client");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const router = express_1.default.Router();
router.post('/', authMiddleware_1.default.authenticate, authMiddleware_1.default.authorize(client_1.Role.USER), cart_controller_1.CartController.create);
router.get('/', authMiddleware_1.default.authenticate, authMiddleware_1.default.authorize(client_1.Role.USER), cart_controller_1.CartController.list // ✅ এখন userId দিয়ে filter হবে
);
router.get("/count", authMiddleware_1.default.authenticate, authMiddleware_1.default.authorize(client_1.Role.USER), cart_controller_1.CartController.getCartCount);
router.get('/:id', cart_controller_1.CartController.getOne);
router.put('/:id', cart_controller_1.CartController.updateOne);
router.delete('/:id', cart_controller_1.CartController.remove);
exports.CartRoutes = router;
