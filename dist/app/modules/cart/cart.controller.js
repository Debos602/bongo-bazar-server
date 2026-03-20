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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const cart_service_1 = require("./cart.service");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId, quantity } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // ✅ userId না থাকলে আগেই error দাও
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const cart = yield cart_service_1.CartService.create({ productId, quantity, userId });
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.CREATED,
            success: true,
            message: 'Cart created',
            data: cart
        });
    }
    catch (error) {
        next(error);
    }
});
const list = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id); // ✅ JWT থেকে userId নিন
    if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    const items = yield cart_service_1.CartService.list(userId); // ✅ userId পাঠান
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "cart retrieved",
        data: items
    });
}));
const getOne = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const item = yield cart_service_1.CartService.getOne(id);
    res.json({
        success: true,
        data: item,
    });
}));
const updateOne = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const data = Object.assign({}, (req.body || {}));
    const updated = yield cart_service_1.CartService.update(id, data);
    res.json({
        success: true,
        data: updated,
    });
}));
const remove = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    yield cart_service_1.CartService.remove(id);
    res.json({
        success: true,
        message: "Deleted successfully",
    });
}));
const getCartCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    if (!userId) {
        res.status(400).json({
            success: false,
            message: "userId query missing or invalid"
        });
        return;
    }
    try {
        const count = yield cart_service_1.CartService.getCartCount(userId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: 'Cart count retrieved successfully',
            data: count
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error
        });
    }
});
exports.CartController = { create, list, getOne, updateOne, remove, getCartCount };
