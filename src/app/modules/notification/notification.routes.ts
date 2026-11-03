import express from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import auth from '../../middlewares/auth';
import { NotificationService } from './notification.service';

const router = express.Router();
const ok = (res: express.Response, message: string, data: unknown) =>
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });

router.get('/', auth(), catchAsync(async (req: any, res) => {
    ok(res, 'Notifications', await NotificationService.list(req.user.id, Math.min(Number(req.query.limit) || 20, 50)));
}));
router.get('/unread-count', auth(), catchAsync(async (req: any, res) => {
    ok(res, 'Unread count', await NotificationService.unreadCount(req.user.id));
}));
router.patch('/read-all', auth(), catchAsync(async (req: any, res) => {
    await NotificationService.markAllRead(req.user.id);
    ok(res, 'All marked as read', null);
}));
router.patch('/:id/read', auth(), catchAsync(async (req: any, res) => {
    await NotificationService.markRead(Number(req.params.id), req.user.id);
    ok(res, 'Marked as read', null);
}));

export const NotificationRoutes = router;
