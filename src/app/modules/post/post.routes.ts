import express from 'express';
import { Role } from '@prisma/client';
import { fileUploader } from '../../../helpers/fileUploader';
import auth from '../../middlewares/auth';
import { PostController } from './post.controller';

const router = express.Router();
const authors = auth(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN);

router.post('/', authors, fileUploader.uploadMemory.single('thumbnail'), PostController.create);
router.get('/', PostController.list);
router.get('/:id', PostController.getOne);
router.put('/:id', authors, fileUploader.uploadMemory.single('thumbnail'), PostController.updateOne);
router.delete('/:id', authors, PostController.remove);

export const PostRoutes = router;
