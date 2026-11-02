import express, { Response } from 'express';
import httpStatus from 'http-status';
import { z } from 'zod';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentService } from './payment.service';

const router = express.Router();

const chooseSchema = z.object({
    body: z.object({
        method: z.enum(['CASH_ON_DELIVERY', 'STRIPE'], { error: 'Only cash on delivery and card payment are available' }),
    }),
});

router.post('/:orderId', auth(), validateRequest(chooseSchema), catchAsync(async (req: any, res: Response) => {
    const result = await PaymentService.choose(Number(req.params.orderId), req.user.id, req.body.method);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Payment method saved', data: result });
}));

export const PaymentRoutes = router;

// Mounted in app.ts ahead of express.json(), because Stripe signs the raw body.
export const stripeWebhook = catchAsync(async (req, res) => {
    await PaymentService.handleWebhook(req.body as Buffer, String(req.headers['stripe-signature'] ?? ''));
    res.json({ received: true });
});
