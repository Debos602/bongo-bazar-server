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
exports.authorize = exports.authenticate = void 0;
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const jwt_1 = require("../helpers/jwt");
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (!token)
            throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, 'You are not authorized');
        const payload = jwt_1.authUtils.verifyToken(token);
        req.user = { id: payload.id, email: payload.email, role: payload.role };
        next();
    }
    catch (err) {
        next(new ApiError_1.default(http_status_1.default.UNAUTHORIZED, err.message || 'Invalid token'));
    }
});
exports.authenticate = authenticate;
const authorize = (...allowed) => (req, res, next) => {
    const user = req.user;
    if (!user)
        return next(new ApiError_1.default(http_status_1.default.UNAUTHORIZED, 'Not authenticated'));
    if (allowed.length && !allowed.includes(user.role)) {
        return next(new ApiError_1.default(http_status_1.default.FORBIDDEN, 'Forbidden'));
    }
    next();
};
exports.authorize = authorize;
exports.default = {
    authenticate: exports.authenticate,
    authorize: exports.authorize,
};
