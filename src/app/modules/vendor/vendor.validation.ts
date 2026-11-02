import { z } from 'zod';

const profile = {
    shopName: z.string().trim().min(2).max(120),
    description: z.string().max(2000).optional().nullable(),
    logo: z.string().optional().nullable(),
    banner: z.string().optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
};

export const vendorValidation = {
    apply: z.object({ body: z.object(profile) }),
    update: z.object({ body: z.object({ ...profile, shopName: profile.shopName.optional() }) }),
    setStatus: z.object({
        body: z.object({
            status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
            reason: z.string().max(500).optional(),
        }),
    }),
    setCommission: z.object({
        body: z.object({ commissionRate: z.number().min(0).max(100).nullable() }),
    }),
};
