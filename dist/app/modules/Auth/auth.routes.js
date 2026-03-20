"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const rateLimiter_1 = require("../../middlewares/rateLimiter");
const auth_controller_1 = require("./auth.controller");
const router = express_1.default.Router();
router.post('/login', rateLimiter_1.authLimiter, auth_controller_1.AuthController.loginUser);
router.post('/register', rateLimiter_1.authLimiter, auth_controller_1.AuthController.register);
router.post('/refresh-token', auth_controller_1.AuthController.refreshToken);
router.post('/change-password', (0, auth_1.default)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN, client_1.Role.USER), auth_controller_1.AuthController.changePassword);
router.post('/forgot-password', auth_controller_1.AuthController.forgotPassword);
router.post('/reset-password', (req, res, next) => {
    //user is resetting password without token and logged in newly created admin or doctor
    if (!req.headers.authorization && req.cookies.accessToken) {
        console.log(req.headers.authorization, "from reset password route guard");
        console.log(req.cookies.accessToken, "from reset password route guard");
        (0, auth_1.default)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN, client_1.Role.USER)(req, res, next);
    }
    else {
        //user is resetting password via email link with token
        next();
    }
}, auth_controller_1.AuthController.resetPassword);
router.get('/me', auth_controller_1.AuthController.getMe);
exports.AuthRoutes = router;
