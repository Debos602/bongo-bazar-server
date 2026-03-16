import express from 'express';
import { CartController } from './cart.controller';
import { Role } from '@prisma/client';
import authMiddleware from '../../middlewares/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware.authenticate,
    authMiddleware.authorize(Role.USER), CartController.create);
router.get('/', CartController.list);
router.get("/count", authMiddleware.authenticate,
    authMiddleware.authorize(Role.USER), CartController.getCartCount);
router.get('/:id', CartController.getOne);
router.put('/:id', CartController.updateOne);
router.delete('/:id', CartController.remove);
export const CartRoutes = router;
