"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRoutes = void 0;
const express_1 = __importDefault(require("express"));
const post_controller_1 = require("./post.controller");
const fileUploader_1 = require("../../../helpers/fileUploader");
const router = express_1.default.Router();
router.post('/', fileUploader_1.fileUploader.uploadMemory.single('thumbnail'), post_controller_1.PostController.create);
router.get('/', post_controller_1.PostController.list);
router.get('/:id', post_controller_1.PostController.getOne);
router.put('/:id', fileUploader_1.fileUploader.uploadMemory.single('thumbnail'), post_controller_1.PostController.updateOne);
router.delete('/:id', post_controller_1.PostController.remove);
exports.PostRoutes = router;
