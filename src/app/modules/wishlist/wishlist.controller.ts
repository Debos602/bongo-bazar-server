import { Request, Response } from 'express';
import { WishlistService } from './wishlist.service';

const create = async (req: Request, res: Response) => {
    const data = { ...(req.body || {}) };
    const created = await WishlistService.create(data);
    res.json(created);
};

const list = async (_req: Request, res: Response) => {
    const items = await WishlistService.list();
    res.json(items);
};

const getOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await WishlistService.getOne(id);
    res.json(item);
};

const updateOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = { ...(req.body || {}) };
    const updated = await WishlistService.update(id, data);
    res.json(updated);
};

const remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await WishlistService.remove(id);
    res.json({ message: 'Deleted' });
};

export const WishlistController = { create, list, getOne, updateOne, remove };
