import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';
import { authUtils } from '../helpers/jwt';
import { Role } from '@prisma/client';

export const authenticate = async (req: Request & { user?: any; }, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader as string;
        if (!token) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');

        const payload: any = authUtils.verifyToken(token) as any;
        req.user = { id: payload.id, email: payload.email, role: payload.role };
        next();
    } catch (err: any) {
        next(new ApiError(httpStatus.UNAUTHORIZED, err.message || 'Invalid token'));
    }
};

export const authorize = (...allowed: Role[]) => (req: Request & { user?: any; }, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ApiError(httpStatus.UNAUTHORIZED, 'Not authenticated'));
    if (allowed.length && !allowed.includes(user.role)) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
    next();
};

export default {
    authenticate,
    authorize,
};
