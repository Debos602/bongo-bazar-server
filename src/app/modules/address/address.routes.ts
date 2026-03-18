import express from 'express';
import { AddressController } from './address.controller';
import authMiddleware from '../../middlewares/authMiddleware';


const router = express.Router();

// ✅ সব route এ authMiddleware যোগ করো
router.post('/', authMiddleware.authenticate, AddressController.create);
router.get('/', authMiddleware.authenticate, AddressController.list);
router.get('/:id', authMiddleware.authenticate, AddressController.getOne);
router.put('/:id', authMiddleware.authenticate, AddressController.updateOne);
router.delete('/:id', authMiddleware.authenticate, AddressController.remove);

export const AddressRoutes = router;