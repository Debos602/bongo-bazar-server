import { Request, Response } from 'express';
import { AddressService } from './address.service';

const create = async (req: Request, res: Response) => {
    const data = { ...(req.body || {}) };
    const created = await AddressService.create(data);
    res.json(created);
};

const list = async (_req: Request, res: Response) => {
    const items = await AddressService.list();
    res.json(items);
};

const getOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const item = await AddressService.getOne(id);
    res.json(item);
};

const updateOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = { ...(req.body || {}) };
    const updated = await AddressService.update(id, data);
    res.json(updated);
};

const remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await AddressService.remove(id);
    res.json({ message: 'Deleted' });
};

export const AddressController = { create, list, getOne, updateOne, remove };
