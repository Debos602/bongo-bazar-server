import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CouponController } from './coupon.controller';
import { couponValidation } from './coupon.validation';

const router = express.Router();
const managers = auth(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN);

router.post('/validate', auth(), validateRequest(couponValidation.check), CouponController.validate);
router.post('/', managers, validateRequest(couponValidation.create), CouponController.create);
router.get('/', managers, CouponController.list);
router.get('/:id', managers, CouponController.getOne);
router.put('/:id', managers, validateRequest(couponValidation.update), CouponController.updateOne);
router.delete('/:id', managers, CouponController.remove);

export const CouponRoutes = router;
