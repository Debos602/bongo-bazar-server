"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistRoutes = void 0;
const express_1 = __importDefault(require("express"));
const wishlist_controller_1 = require("./wishlist.controller");
const router = express_1.default.Router();
router.post('/', wishlist_controller_1.WishlistController.create);
router.get('/', wishlist_controller_1.WishlistController.list);
router.get('/:id', wishlist_controller_1.WishlistController.getOne);
router.put('/:id', wishlist_controller_1.WishlistController.updateOne);
router.delete('/:id', wishlist_controller_1.WishlistController.remove);
exports.WishlistRoutes = router;
