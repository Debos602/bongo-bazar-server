import express from 'express';
import { OrderController } from './order.controller';
import authMiddleware from '../../middlewares/authMiddleware';


const router = express.Router();

// ✅ নতুন route
router.post('/with-address', authMiddleware.authenticate, OrderController.createWithAddress);  // Cart থেকে
router.post('/direct', authMiddleware.authenticate, OrderController.createDirect);        // Buy Now
router.get('/', authMiddleware.authenticate, OrderController.list);
router.get('/:id', authMiddleware.authenticate, OrderController.getOne);
router.patch('/:id/status', authMiddleware.authenticate, OrderController.updateStatus);
router.delete('/:id', authMiddleware.authenticate, OrderController.remove);

export const OrderRoutes = router;