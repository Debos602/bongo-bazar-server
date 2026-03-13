import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const RoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "USER"]);
export const UserStatusEnum = z.enum(["ACTIVE", "INACTIVE", "BLOCK"]);

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
    email: z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    name: z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim(),

    password: z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),

    phone: z
        .string({ error: "Phone number is required" })
        .min(7, "Phone number is too short")
        .max(20, "Phone number is too long")
        .regex(/^\+?[0-9\s\-().]+$/, "Invalid phone number format"),

    picture: z
        .string()
        .url("Picture must be a valid URL")
        .optional()
        .nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    password: z
        .string({ error: "Password is required" })
        .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Update Profile ───────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim()
        .optional(),

    phone: z
        .string()
        .min(7, "Phone number is too short")
        .max(20, "Phone number is too long")
        .regex(/^\+?[0-9\s\-().]+$/, "Invalid phone number format")
        .optional(),

    picture: z
        .string()
        .url("Picture must be a valid URL")
        .optional()
        .nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Change Password ──────────────────────────────────────────────────────────

export const changePasswordSchema = z
    .object({
        currentPassword: z
            .string({ error: "Current password is required" })
            .min(1, "Current password is required"),

        newPassword: z
            .string({ error: "New password is required" })
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password must not exceed 128 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),

        confirmPassword: z
            .string({ error: "Please confirm your new password" })
            .min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
    });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Forgot / Reset Password ──────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
    email: z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        token: z
            .string({ error: "Reset token is required" })
            .min(1, "Reset token is required"),

        newPassword: z
            .string({ error: "New password is required" })
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password must not exceed 128 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),

        confirmPassword: z
            .string({ error: "Please confirm your new password" })
            .min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Admin: Update User ───────────────────────────────────────────────────────

export const adminUpdateUserSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim()
        .optional(),

    email: z
        .string()
        .email("Invalid email address")
        .toLowerCase()
        .trim()
        .optional(),

    phone: z
        .string()
        .min(7, "Phone number is too short")
        .max(20, "Phone number is too long")
        .regex(/^\+?[0-9\s\-().]+$/, "Invalid phone number format")
        .optional(),

    picture: z
        .string()
        .url("Picture must be a valid URL")
        .optional()
        .nullable(),

    role: RoleEnum.optional(),

    status: UserStatusEnum.optional(),

    isVerified: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// ─── Additional Schemas (compatibility with routes) ───────────────────────────

export const createAdminSchema = z.object({
    email: z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim()
        .optional(),

    password: z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),

    picture: z.string().url("Picture must be a valid URL").optional().nullable(),

    contactNumber: z.string().optional(),
});

export const updateStatusSchema = z.object({
    body: z.object({
        status: UserStatusEnum,
    }),
});

export const userValidation = {
    createAdmin: createAdminSchema,
    updateStatus: updateStatusSchema,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export const userIdParamSchema = z.object({
    id: z.coerce
        .number({ error: "User ID must be a number" })
        .int("User ID must be an integer")
        .positive("User ID must be a positive number"),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;