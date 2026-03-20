"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryValidation = void 0;
const zod_1 = require("zod");
exports.categoryValidation = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string({ error: "Category name is required" }).min(1).max(255),
            slug: zod_1.z.string({ error: "Slug is required" }).min(1).max(255)
        })
    }),
    update: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string().min(1).max(255).optional(),
            slug: zod_1.z.string().min(1).max(255).optional()
        })
    })
};
