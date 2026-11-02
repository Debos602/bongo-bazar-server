import express from 'express';
import auth from '../../middlewares/auth';
import { WishlistController } from './wishlist.controller';

const router = express.Router();

router.post('/', auth(), WishlistController.create);
router.get('/', auth(), WishlistController.list);
router.delete('/', auth(), WishlistController.clear);
router.delete('/product/:productId', auth(), WishlistController.removeByProduct);
router.delete('/:id', auth(), WishlistController.remove);

export const WishlistRoutes = router;
