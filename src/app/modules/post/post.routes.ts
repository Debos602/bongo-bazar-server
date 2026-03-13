import express from 'express';
import { PostController } from './post.controller';
import { fileUploader } from '../../../helpers/fileUploader';

const router = express.Router();

router.post('/', fileUploader.uploadMemory.single('thumbnail'), PostController.create);
router.get('/', PostController.list);
router.get('/:id', PostController.getOne);
router.put('/:id', fileUploader.uploadMemory.single('thumbnail'), PostController.updateOne);
router.delete('/:id', PostController.remove);

export const PostRoutes = router;
