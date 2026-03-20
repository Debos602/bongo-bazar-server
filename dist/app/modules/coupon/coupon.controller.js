"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponController = void 0;
const coupon_service_1 = require("./coupon.service");
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = Object.assign({}, (req.body || {}));
    const created = yield coupon_service_1.CouponService.create(data);
    res.json(created);
});
const list = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const items = yield coupon_service_1.CouponService.list();
    res.json(items);
});
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const item = yield coupon_service_1.CouponService.getOne(id);
    res.json(item);
});
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const data = Object.assign({}, (req.body || {}));
    const updated = yield coupon_service_1.CouponService.update(id, data);
    res.json(updated);
});
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    yield coupon_service_1.CouponService.remove(id);
    res.json({ message: 'Deleted' });
});
exports.CouponController = { create, list, getOne, updateOne, remove };
