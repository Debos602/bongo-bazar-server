import { z } from 'zod';

// Multipart forms send strings, so numbers, booleans and lists are coerced here.
const toArray = (v: unknown) => {
    if (v === undefined || v === '') return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return v.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [v];
};
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);
const bool = z.preprocess((v) => (v === undefined || v === '' ? undefined : v === true || v === 'true'), z.boolean().optional());

const fields = {
    name: z.string().trim().min(1).max(255),
    slug: z.string().trim().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    price: z.coerce.number().positive(),
    oldPrice: z.preprocess(blankToUndefined, z.coerce.number().positive().optional()),
    discount: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100).optional()),
    stock: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).optional()),
    sku: z.string().optional().nullable(),
    tags: z.preprocess(toArray, z.array(z.string()).optional()),
    badgeType: z.preprocess(blankToUndefined, z.enum(['NEW', 'HOT', 'SALE', 'BESTSELLER', 'LIMITED']).optional()),
    image: z.string().min(1),
    images: z.preprocess(toArray, z.array(z.string()).optional()),
    isPublished: bool,
    categories: z.preprocess(toArray, z.array(z.coerce.number().int().positive()).optional()),
};

export const productValidation = {
    create: z.object(fields),
    update: z.object(fields).partial(),
    moderate: z.object({
        body: z.object({ isBlocked: z.boolean().optional(), isFeatured: z.boolean().optional() }),
    }),
};
