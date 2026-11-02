import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { VendorStatus } from '@prisma/client';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VendorService } from './vendor.service';

const ok = (res: Response, message: string, data: unknown, statusCode: number = httpStatus.OK) =>
    sendResponse(res, { statusCode, success: true, message, data });

const paging = (req: Request) => ({
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 10, 100),
});

export const VendorController = {
    createVendor: catchAsync(async (req: any, res) => {
        ok(res, 'Application submitted. An admin will review it.', await VendorService.create(req.user.id, req.body), httpStatus.CREATED);
    }),
    listVendors: catchAsync(async (req, res) => {
        const { page, limit } = paging(req);
        ok(res, 'Vendors retrieved successfully', await VendorService.list(page, limit));
    }),
    searchVendors: catchAsync(async (req, res) => {
        const { page, limit } = paging(req);
        ok(res, 'Vendors searched successfully', await VendorService.search(String(req.query.q ?? ''), page, limit));
    }),
    adminList: catchAsync(async (req, res) => {
        const { page, limit } = paging(req);
        const status = Object.values(VendorStatus).find((s) => s === req.query.status);
        ok(res, 'Vendors retrieved successfully', await VendorService.adminList(status, page, limit));
    }),
    getVendor: catchAsync(async (req, res) => {
        ok(res, 'Vendor retrieved successfully', await VendorService.getOne(Number(req.params.id)));
    }),
    getVendorBySlug: catchAsync(async (req, res) => {
        ok(res, 'Vendor retrieved successfully', await VendorService.getBySlug(String(req.params.slug)));
    }),
    getMyVendorProfile: catchAsync(async (req: any, res) => {
        ok(res, 'Vendor profile retrieved successfully', await VendorService.getByUserId(req.user.id));
    }),
    updateMyProfile: catchAsync(async (req: any, res) => {
        const vendor = await VendorService.getByUserId(req.user.id);
        ok(res, 'Shop updated successfully', await VendorService.update(vendor.id, req.body, req.user));
    }),
    updateVendor: catchAsync(async (req: any, res) => {
        ok(res, 'Vendor updated successfully', await VendorService.update(Number(req.params.id), req.body, req.user));
    }),
    setStatus: catchAsync(async (req, res) => {
        ok(res, 'Vendor status updated', await VendorService.setStatus(Number(req.params.id), req.body.status, req.body.reason));
    }),
    setCommission: catchAsync(async (req, res) => {
        ok(res, 'Commission updated', await VendorService.setCommission(Number(req.params.id), req.body.commissionRate));
    }),
    getVendorStats: catchAsync(async (req: any, res) => {
        ok(res, 'Vendor statistics retrieved successfully', await VendorService.getVendorStats(Number(req.params.id), req.user));
    }),
    getVendorProducts: catchAsync(async (req, res) => {
        const { page, limit } = paging(req);
        ok(res, 'Vendor products retrieved successfully', await VendorService.getVendorProducts(Number(req.params.id), page, limit));
    }),
    deleteVendor: catchAsync(async (req, res) => {
        const result = await VendorService.remove(Number(req.params.id));
        ok(res, result.message, null);
    }),
};
