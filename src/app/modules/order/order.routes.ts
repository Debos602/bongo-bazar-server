import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { OrderController } from './order.controller';
import { orderValidation } from './order.validation';

const router = express.Router();
const admins = auth(Role.ADMIN, Role.SUPER_ADMIN);

router.post('/with-address', auth(), validateRequest(orderValidation.withAddress), OrderController.createWithAddress);
router.post('/direct', auth(), validateRequest(orderValidation.direct), OrderController.createDirect);

// Static paths come before /:id
router.get('/vendor', auth(Role.VENDOR), OrderController.vendorList);
router.patch('/vendor/:id/status', auth(Role.VENDOR), validateRequest(orderValidation.status), OrderController.vendorUpdateStatus);
router.get('/admin/all', admins, OrderController.adminList);
router.get('/admin/:id', admins, OrderController.adminGetOne);

router.get('/', auth(), OrderController.list);
router.get('/:id', auth(), OrderController.getOne);
router.post('/:id/cancel', auth(), OrderController.cancelMine);
router.patch('/:id/status', admins, validateRequest(orderValidation.status), OrderController.updateStatus);
router.delete('/:id', admins, OrderController.remove);

export const OrderRoutes = router;
