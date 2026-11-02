import express from 'express';
import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import { z } from 'zod';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PayoutService } from './payout.service';

const router = express.Router();
const admins = auth(Role.ADMIN, Role.SUPER_ADMIN);

const requestSchema = z.object({
    body: z.object({
        amount: z.coerce.number().positive(),
        method: z.string().trim().min(2).max(60),
        accountDetails: z.string().trim().min(3).max(300),
        note: z.string().max(500).optional(),
    }),
});
const processSchema = z.object({
    body: z.object({
        status: z.enum(['PAID', 'REJECTED']),
        transactionRef: z.string().max(120).optional(),
        note: z.string().max(500).optional(),
    }),
});

router.get('/mine', auth(Role.VENDOR), catchAsync(async (req: any, res) => {
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Payouts fetched', data: await PayoutService.mine(req.user.id) });
}));
router.post('/', auth(Role.VENDOR), validateRequest(requestSchema), catchAsync(async (req: any, res) => {
    sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Payout requested', data: await PayoutService.request(req.user.id, req.body) });
}));
router.get('/', admins, catchAsync(async (req, res) => {
    const result = await PayoutService.adminList(req.query);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Payouts fetched', meta: result.meta, data: result.data });
}));
router.patch('/:id', admins, validateRequest(processSchema), catchAsync(async (req, res) => {
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Payout updated', data: await PayoutService.process(Number(req.params.id), req.body) });
}));

export const PayoutRoutes = router;
