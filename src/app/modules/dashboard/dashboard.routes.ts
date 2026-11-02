import express from 'express';
import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import auth from '../../middlewares/auth';
import { DashboardService } from './dashboard.service';

const router = express.Router();

router.get('/admin', auth(Role.ADMIN, Role.SUPER_ADMIN), catchAsync(async (req, res) => {
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Admin dashboard', data: await DashboardService.admin() });
}));
router.get('/vendor', auth(Role.VENDOR), catchAsync(async (req: any, res) => {
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Vendor dashboard', data: await DashboardService.vendor(req.user.id) });
}));
router.get('/user', auth(), catchAsync(async (req: any, res) => {
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'User dashboard', data: await DashboardService.user(req.user.id) });
}));

export const DashboardRoutes = router;
