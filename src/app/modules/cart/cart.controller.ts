import { Request, Response } from 'express';
import { CartService } from './cart.service';

const create = async (req: Request, res: Response) => {
    const data = { ...(req.body || {}) };
    const created = await CartService.create(data);
    res.json(created);
};

const list = async (_req: Request, res: Response) => {
    const items = await CartService.list();
    res.json(items);
};

const getOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await CartService.getOne(id);
    res.json(item);
};

const updateOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = { ...(req.body || {}) };
    const updated = await CartService.update(id, data);
    res.json(updated);
};

const remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await CartService.remove(id);
    res.json({ message: 'Deleted' });
};

export const CartController = { create, list, getOne, updateOne, remove };
