import { Request, Response } from 'express';
import { CouponService } from './coupon.service';

const create = async (req: Request, res: Response) => {
    const data = { ...(req.body || {}) };
    const created = await CouponService.create(data);
    res.json(created);
};

const list = async (_req: Request, res: Response) => {
    const items = await CouponService.list();
    res.json(items);
};

const getOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await CouponService.getOne(id);
    res.json(item);
};

const updateOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = { ...(req.body || {}) };
    const updated = await CouponService.update(id, data);
    res.json(updated);
};

const remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await CouponService.remove(id);
    res.json({ message: 'Deleted' });
};

export const CouponController = { create, list, getOne, updateOne, remove };
