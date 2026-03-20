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
exports.fileUploader = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = __importDefault(require("./cloudinary"));
// Disk storage (keeps compatibility)
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path_1.default.join(process.cwd(), '/uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
// Memory storage for direct buffer uploads
const memoryStorage = multer_1.default.memoryStorage();
const uploadDisk = (0, multer_1.default)({ storage });
const uploadMemory = (0, multer_1.default)({ storage: memoryStorage });
function uploadFilePathToCloudinary(filePath, originalname) {
    return __awaiter(this, void 0, void 0, function* () {
        const uploadResult = yield cloudinary_1.default.uploader.upload(filePath, {
            public_id: `${originalname !== null && originalname !== void 0 ? originalname : 'file'}-${Date.now()}`,
            folder: 'ph-health-care',
        });
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch (e) { /* ignore */ }
        return uploadResult;
    });
}
function uploadBufferToCloudinary(buffer, originalname) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({ public_id: `${originalname !== null && originalname !== void 0 ? originalname : 'file'}-${Date.now()}`, folder: 'ph-health-care' }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result);
        });
        stream.end(buffer);
    });
}
// Backwards-compatible wrapper: accept multer file
function uploadToCloudinary(file) {
    return __awaiter(this, void 0, void 0, function* () {
        if (file.buffer) {
            return uploadBufferToCloudinary(file.buffer, file.originalname);
        }
        return uploadFilePathToCloudinary(file.path, file.originalname);
    });
}
exports.fileUploader = {
    // original exports
    upload: uploadDisk,
    uploadToCloudinary,
    // new helpers
    uploadDisk,
    uploadMemory,
    uploadFilePathToCloudinary,
    uploadBufferToCloudinary,
};
