"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRoutes = void 0;
const express_1 = __importDefault(require("express"));
const review_controller_1 = require("./review.controller");
const router = express_1.default.Router();
router.post('/', review_controller_1.ReviewController.create);
router.get('/', review_controller_1.ReviewController.list);
router.get('/:id', review_controller_1.ReviewController.getOne);
router.put('/:id', review_controller_1.ReviewController.updateOne);
router.delete('/:id', review_controller_1.ReviewController.remove);
exports.ReviewRoutes = router;
