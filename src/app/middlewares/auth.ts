import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import prisma from "../../shared/prisma";
import ApiError from "../errors/ApiError";

const extractToken = (req: Request): string | undefined => {
    const authHeader = req.headers.authorization;
    return authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader?.trim() || req.cookies?.accessToken;
};

// Role and status come from the database, not the token, so approving, suspending or
// blocking someone takes effect immediately instead of when their token expires.
const resolveUser = async (token: string) => {
    let payload;
    try {
        payload = jwtHelpers.verifyToken(token, config.jwt.jwt_secret as Secret);
    } catch {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token");
    }
    const user = await prisma.user.findUnique({
        where: { id: Number(payload.id) },
        select: { id: true, email: true, role: true, status: true },
    });
    if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
    if (user.status !== UserStatus.ACTIVE) throw new ApiError(httpStatus.FORBIDDEN, "Your account is not active");
    return { id: user.id, email: user.email, role: user.role };
};

const auth = (...roles: string[]) => {
    return async (req: Request & { user?: any; }, res: Response, next: NextFunction) => {
        try {
            const token = extractToken(req);
            if (!token) throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
            const user = await resolveUser(token);
            req.user = user;
            if (roles.length && !roles.includes(user.role)) {
                throw new ApiError(httpStatus.FORBIDDEN, "Forbidden!");
            }
            next();
        } catch (err) {
            next(err);
        }
    };
};

// Sets req.user when a valid token is present; otherwise continues as a guest.
export const optionalAuth = async (req: Request & { user?: any; }, res: Response, next: NextFunction) => {
    try {
        const token = extractToken(req);
        if (token) req.user = await resolveUser(token);
    } catch {
        req.user = undefined;
    }
    next();
};

export default auth;
