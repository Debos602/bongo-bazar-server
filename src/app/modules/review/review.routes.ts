import express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ReviewController } from './review.controller';

const rating = z.number().int().min(1).max(5);
const comment = z.string().max(2000).optional();
const createSchema = z.object({ body: z.object({ productId: z.number().int().positive(), rating, comment }) });
const updateSchema = z.object({ body: z.object({ rating: rating.optional(), comment }) });

const router = express.Router();

router.get('/', ReviewController.list);
router.get('/mine', auth(), ReviewController.mine);
router.get('/vendor', auth(Role.VENDOR), ReviewController.forVendor);
router.post('/', auth(), validateRequest(createSchema), ReviewController.create);
router.get('/:id', ReviewController.getOne);
router.put('/:id', auth(), validateRequest(updateSchema), ReviewController.updateOne);
router.delete('/:id', auth(), ReviewController.remove);

export const ReviewRoutes = router;
