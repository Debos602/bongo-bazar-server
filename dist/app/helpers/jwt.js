"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../config"));
const signToken = (payload, expiresIn) => {
    var _a;
    const exp = (_a = expiresIn !== null && expiresIn !== void 0 ? expiresIn : config_1.default.jwt.expires_in) !== null && _a !== void 0 ? _a : '1h';
    const opts = { algorithm: 'HS256', expiresIn: exp };
    return jsonwebtoken_1.default.sign(payload, String(config_1.default.jwt.jwt_secret), opts);
};
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, String(config_1.default.jwt.jwt_secret));
};
exports.authUtils = {
    signToken,
    verifyToken,
};
exports.default = exports.authUtils;
