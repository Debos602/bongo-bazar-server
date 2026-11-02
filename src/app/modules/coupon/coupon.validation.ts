import { z } from 'zod';

const fields = {
    code: z.string().trim().min(3).max(40).toUpperCase(),
    discount: z.number().int().min(1).max(100),
    expiresAt: z.coerce.date().optional().nullable(),
    isActive: z.boolean().optional(),
    usageLimit: z.number().int().positive().optional().nullable(),
};

export const couponValidation = {
    create: z.object({ body: z.object(fields) }),
    update: z.object({ body: z.object(fields).partial() }),
    check: z.object({ body: z.object({ code: z.string().min(1) }) }),
};
