import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import ApiError from '../errors/ApiError';
import auth from './auth';

export const authenticate = auth();

export const authorize = (...allowed: Role[]) => (req: Request & { user?: any; }, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ApiError(httpStatus.UNAUTHORIZED, 'Not authenticated'));
    if (allowed.length && !allowed.includes(user.role)) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
    next();
};

export default { authenticate, authorize };
