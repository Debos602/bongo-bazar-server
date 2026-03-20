"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponRoutes = void 0;
const express_1 = __importDefault(require("express"));
const coupon_controller_1 = require("./coupon.controller");
const router = express_1.default.Router();
router.post('/', coupon_controller_1.CouponController.create);
router.get('/', coupon_controller_1.CouponController.list);
router.get('/:id', coupon_controller_1.CouponController.getOne);
router.put('/:id', coupon_controller_1.CouponController.updateOne);
router.delete('/:id', coupon_controller_1.CouponController.remove);
exports.CouponRoutes = router;
