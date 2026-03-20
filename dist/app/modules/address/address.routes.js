"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressRoutes = void 0;
const express_1 = __importDefault(require("express"));
const address_controller_1 = require("./address.controller");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const router = express_1.default.Router();
// ✅ সব route এ authMiddleware যোগ করো
router.post('/', authMiddleware_1.default.authenticate, address_controller_1.AddressController.create);
router.get('/', authMiddleware_1.default.authenticate, address_controller_1.AddressController.list);
router.get('/:id', authMiddleware_1.default.authenticate, address_controller_1.AddressController.getOne);
router.put('/:id', authMiddleware_1.default.authenticate, address_controller_1.AddressController.updateOne);
router.delete('/:id', authMiddleware_1.default.authenticate, address_controller_1.AddressController.remove);
exports.AddressRoutes = router;
