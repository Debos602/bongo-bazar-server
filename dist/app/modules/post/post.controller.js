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
exports.PostController = void 0;
const fileUploader_1 = require("../../../helpers/fileUploader");
const post_service_1 = require("./post.service");
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = Object.assign({}, (req.body || {}));
    const file = req.file;
    if (file) {
        const uploadResult = file.buffer
            ? yield fileUploader_1.fileUploader.uploadBufferToCloudinary(file.buffer, file.originalname)
            : yield fileUploader_1.fileUploader.uploadFilePathToCloudinary(file.path, file.originalname);
        data.thumbnail = uploadResult.secure_url;
    }
    const created = yield post_service_1.PostService.create(data);
    res.json(created);
});
const list = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const items = yield post_service_1.PostService.list();
    res.json(items);
});
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const item = yield post_service_1.PostService.getOne(id);
    res.json(item);
});
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const data = Object.assign({}, (req.body || {}));
    const file = req.file;
    if (file) {
        const uploadResult = file.buffer
            ? yield fileUploader_1.fileUploader.uploadBufferToCloudinary(file.buffer, file.originalname)
            : yield fileUploader_1.fileUploader.uploadFilePathToCloudinary(file.path, file.originalname);
        data.thumbnail = uploadResult.secure_url;
    }
    const updated = yield post_service_1.PostService.update(id, data);
    res.json(updated);
});
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    yield post_service_1.PostService.remove(id);
    res.json({ message: 'Deleted' });
});
exports.PostController = { create, list, getOne, updateOne, remove };
