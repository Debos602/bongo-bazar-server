import express from 'express';
import { CouponController } from './coupon.controller';

const router = express.Router();

router.post('/', CouponController.create);
router.get('/', CouponController.list);
router.get('/:id', CouponController.getOne);
router.put('/:id', CouponController.updateOne);
router.delete('/:id', CouponController.remove);

export const CouponRoutes = router;
