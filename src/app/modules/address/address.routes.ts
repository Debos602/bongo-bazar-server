import express from 'express';
import { AddressController } from './address.controller';

const router = express.Router();

router.post('/', AddressController.create);
router.get('/', AddressController.list);
router.get('/:id', AddressController.getOne);
router.put('/:id', AddressController.updateOne);
router.delete('/:id', AddressController.remove);

export const AddressRoutes = router;
