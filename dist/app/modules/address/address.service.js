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
exports.AddressService = void 0;
const prisma_1 = __importDefault(require("../../../shared/prisma"));
exports.AddressService = {
    // ✅ userId token থেকে নেবে
    create: (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.address.create({
            data: Object.assign(Object.assign({}, data), { userId }),
        });
    }),
    // ✅ শুধু নিজের address দেখাবে
    list: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.address.findMany({
            where: { userId },
        });
    }),
    getOne: (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.address.findFirst({
            where: { id, userId }, // ✅ অন্যের address দেখা যাবে না
        });
    }),
    update: (id, userId, data) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.address.update({
            where: { id, userId },
            data,
        });
    }),
    remove: (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
        return prisma_1.default.address.delete({
            where: { id, userId },
        });
    }),
};
