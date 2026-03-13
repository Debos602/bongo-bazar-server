import express from 'express';
import { ReviewController } from './review.controller';

const router = express.Router();

router.post('/', ReviewController.create);
router.get('/', ReviewController.list);
router.get('/:id', ReviewController.getOne);
router.put('/:id', ReviewController.updateOne);
router.delete('/:id', ReviewController.remove);

export const ReviewRoutes = router;
