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
exports.WishlistController = void 0;
const wishlist_service_1 = require("./wishlist.service");
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = Object.assign({}, (req.body || {}));
    const created = yield wishlist_service_1.WishlistService.create(data);
    res.json(created);
});
const list = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const items = yield wishlist_service_1.WishlistService.list();
    res.json(items);
});
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const item = yield wishlist_service_1.WishlistService.getOne(id);
    res.json(item);
});
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const data = Object.assign({}, (req.body || {}));
    const updated = yield wishlist_service_1.WishlistService.update(id, data);
    res.json(updated);
});
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    yield wishlist_service_1.WishlistService.remove(id);
    res.json({ message: 'Deleted' });
});
exports.WishlistController = { create, list, getOne, updateOne, remove };
