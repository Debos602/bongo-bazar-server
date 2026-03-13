import { Request, Response } from 'express';
import { OrderService } from './order.service';

const create = async (req: Request, res: Response) => {
    const data = { ...(req.body || {}) };
    const created = await OrderService.create(data);
    res.json(created);
};

const list = async (_req: Request, res: Response) => {
    const items = await OrderService.list();
    res.json(items);
};

const getOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await OrderService.getOne(id);
    res.json(item);
};

const updateOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = { ...(req.body || {}) };
    const updated = await OrderService.update(id, data);
    res.json(updated);
};

const remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await OrderService.remove(id);
    res.json({ message: 'Deleted' });
};

export const OrderController = { create, list, getOne, updateOne, remove };
