"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdParamSchema = exports.userValidation = exports.updateStatusSchema = exports.createAdminSchema = exports.adminUpdateUserSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = exports.UserStatusEnum = exports.RoleEnum = void 0;
const zod_1 = require("zod");
// ─── Enums ────────────────────────────────────────────────────────────────────
exports.RoleEnum = zod_1.z.enum(["SUPER_ADMIN", "ADMIN", "USER"]);
exports.UserStatusEnum = zod_1.z.enum(["ACTIVE", "INACTIVE", "BLOCK"]);
// ─── Register ─────────────────────────────────────────────────────────────────
exports.registerSchema = zod_1.z.object({
    email: zod_1.z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    name: zod_1.z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim(),
    password: zod_1.z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    phone: zod_1.z
        .string({ error: "Phone number is required" })
        .min(7, "Phone number is too short")
        .max(20, "Phone number is too long")
        .regex(/^\+?[0-9\s\-().]+$/, "Invalid phone number format"),
    picture: zod_1.z
        .string()
        .url("Picture must be a valid URL")
        .optional()
        .nullable(),
});
// ─── Login ────────────────────────────────────────────────────────────────────
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    password: zod_1.z
        .string({ error: "Password is required" })
        .min(1, "Password is required"),
});
// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim()
        .optional(),
    phone: zod_1.z
        .string()
        .min(7, "Phone number is too short")
        .max(20, "Phone number is too long")
        .regex(/^\+?[0-9\s\-().]+$/, "Invalid phone number format")
        .optional(),
    picture: zod_1.z
        .string()
        .url("Picture must be a valid URL")
        .optional()
        .nullable(),
});
// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z
        .string({ error: "Current password is required" })
        .min(1, "Current password is required"),
    newPassword: zod_1.z
        .string({ error: "New password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: zod_1.z
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
// ─── Forgot / Reset Password ──────────────────────────────────────────────────
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
});
exports.resetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z
        .string({ error: "Reset token is required" })
        .min(1, "Reset token is required"),
    newPassword: zod_1.z
        .string({ error: "New password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: zod_1.z
        .string({ error: "Please confirm your new password" })
        .min(1, "Please confirm your new password"),
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
// ─── Admin: Update User ───────────────────────────────────────────────────────
exports.adminUpdateUserSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim()
        .optional(),
    email: zod_1.z
        .string()
        .email("Invalid email address")
        .toLowerCase()
        .trim()
        .optional(),
    phone: zod_1.z
        .string()
        .min(7, "Phone number is too short")
        .max(20, "Phone number is too long")
        .regex(/^\+?[0-9\s\-().]+$/, "Invalid phone number format")
        .optional(),
    picture: zod_1.z
        .string()
        .url("Picture must be a valid URL")
        .optional()
        .nullable(),
    role: exports.RoleEnum.optional(),
    status: exports.UserStatusEnum.optional(),
    isVerified: zod_1.z.boolean().optional(),
});
// ─── Additional Schemas (compatibility with routes) ───────────────────────────
exports.createAdminSchema = zod_1.z.object({
    email: zod_1.z
        .string({ error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .trim()
        .optional(),
    password: zod_1.z
        .string({ error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    picture: zod_1.z.string().url("Picture must be a valid URL").optional().nullable(),
    contactNumber: zod_1.z.string().optional(),
});
exports.updateStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: exports.UserStatusEnum,
    }),
});
exports.userValidation = {
    createAdmin: exports.createAdminSchema,
    updateStatus: exports.updateStatusSchema,
};
// ─── Params ───────────────────────────────────────────────────────────────────
exports.userIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce
        .number({ error: "User ID must be a number" })
        .int("User ID must be an integer")
        .positive("User ID must be a positive number"),
});
