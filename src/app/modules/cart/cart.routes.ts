import express from 'express';
import { CartController } from './cart.controller';

const router = express.Router();

router.post('/', CartController.create);
router.get('/', CartController.list);
router.get('/:id', CartController.getOne);
router.put('/:id', CartController.updateOne);
router.delete('/:id', CartController.remove);

export const CartRoutes = router;
