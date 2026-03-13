import { Request, Response } from 'express';
import { fileUploader } from '../../../helpers/fileUploader';
import { PostService } from './post.service';

const create = async (req: Request, res: Response) => {
    const data: any = { ...(req.body || {}) };
    const file: Express.Multer.File | undefined = (req as any).file;

    if (file) {
        const uploadResult: any = file.buffer
            ? await fileUploader.uploadBufferToCloudinary(file.buffer, file.originalname)
            : await fileUploader.uploadFilePathToCloudinary(file.path, file.originalname);
        data.thumbnail = uploadResult.secure_url;
    }

    const created = await PostService.create(data);
    res.json(created);
};

const list = async (_req: Request, res: Response) => {
    const items = await PostService.list();
    res.json(items);
};

const getOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await PostService.getOne(id);
    res.json(item);
};

const updateOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data: any = { ...(req.body || {}) };
    const file: Express.Multer.File | undefined = (req as any).file;

    if (file) {
        const uploadResult: any = file.buffer
            ? await fileUploader.uploadBufferToCloudinary(file.buffer, file.originalname)
            : await fileUploader.uploadFilePathToCloudinary(file.path, file.originalname);
        data.thumbnail = uploadResult.secure_url;
    }

    const updated = await PostService.update(id, data);
    res.json(updated);
};

const remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await PostService.remove(id);
    res.json({ message: 'Deleted' });
};

export const PostController = { create, list, getOne, updateOne, remove };
