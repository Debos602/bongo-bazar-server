import express from 'express';
import { WishlistController } from './wishlist.controller';

const router = express.Router();

router.post('/', WishlistController.create);
router.get('/', WishlistController.list);
router.get('/:id', WishlistController.getOne);
router.put('/:id', WishlistController.updateOne);
router.delete('/:id', WishlistController.remove);

export const WishlistRoutes = router;
