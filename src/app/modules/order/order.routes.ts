import express from 'express';
import { OrderController } from './order.controller';

const router = express.Router();

router.post('/', OrderController.create);
router.get('/', OrderController.list);
router.get('/:id', OrderController.getOne);
router.put('/:id', OrderController.updateOne);
router.delete('/:id', OrderController.remove);

export const OrderRoutes = router;
