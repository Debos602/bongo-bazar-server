import rateLimit from "express-rate-limit";
import config from "../../config";

export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    // JSON like every other response, so callers can show the reason.
    message: { success: false, message: "Too many requests. Please wait a few minutes and try again." },
    // Local development loads many pages from one address, which would hit the limit quickly.
    skip: () => config.env !== "production",
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Limit login attempts
    message: "Too many login attempts, please try again later.",
    skipSuccessfulRequests: true,
});
export const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many payment attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
