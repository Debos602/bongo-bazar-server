import { z } from 'zod';

const fields = {
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(30),
    city: z.string().trim().min(1).max(120),
    area: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(500),
    postalCode: z.string().trim().max(20).optional().nullable(),
};

export const addressFields = z.object(fields);
export const addressValidation = {
    create: z.object({ body: z.object(fields) }),
    update: z.object({ body: z.object(fields).partial() }),
};
