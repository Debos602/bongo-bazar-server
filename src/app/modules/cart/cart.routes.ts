import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { CartController } from './cart.controller';

const router = express.Router();
const shoppers = auth(Role.USER, Role.VENDOR);

router.post('/', shoppers, CartController.create);
router.get('/', shoppers, CartController.list);
router.get('/count', shoppers, CartController.getCartCount);
router.get('/:id', shoppers, CartController.getOne);
router.put('/:id', shoppers, CartController.updateOne);
router.delete('/:id', shoppers, CartController.remove);

export const CartRoutes = router;
