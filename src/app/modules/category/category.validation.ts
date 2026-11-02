import { z } from 'zod';

export const categoryValidation = {
    create: z.object({
        body: z.object({
            name: z.string({ error: "Category name is required" }).min(1).max(255),
            slug: z.string({ error: "Slug is required" }).min(1).max(255),
            Image: z.string().optional().nullable()
        })
    }),

    update: z.object({
        body: z.object({
            name: z.string().min(1).max(255).optional(),
            slug: z.string().min(1).max(255).optional(),
            Image: z.string().optional().nullable()
        })
    })
};