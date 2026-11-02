import { User, Prisma, Role, UserStatus } from "@prisma/client";
import * as bcrypt from 'bcryptjs';
import { Request } from "express";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import config from "../../../config";
import { fileUploader } from "../../../helpers/fileUploader";
import { paginationHelper } from "../../../helpers/paginationHelper";
import prisma from "../../../shared/prisma";
import { IAuthUser } from "../../interfaces/common";
import { IPaginationOptions } from "../../interfaces/pagination";
import { userSearchAbleFields } from "./user.constant";

const createAdmin = async (req: Request): Promise<Omit<User, 'password'>> => {
    req.body = req.body ?? {};

    const file = req.file;
    if (file) {
        const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
        req.body.picture = uploadToCloudinary?.secure_url;
    }

    if (!req.body.password) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required');
    }

    if (!req.body.email) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email is required');
    }

    const hashedPassword: string = await bcrypt.hash(
        req.body.password,
        Number(config.salt_round)
    );

    const adminEmail: string = req.body.email.toLowerCase().trim();
    const derivedName: string = req.body.name ?? adminEmail.split('@')[0];

    const userData = {
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        name: derivedName,
        phone: req.body.phone ?? req.body.contactNumber ?? '',
        picture: req.body.picture ?? null,
    };

    const result = await prisma.user.create({
        data: userData,
        select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            email: true,
            name: true,
            phone: true,
            picture: true,
            needPasswordChange: true,
            isVerified: true,
            status: true,
            role: true,
        }
    });

    return result;
};

const getAllFromDB = async (params: any, options: IPaginationOptions) => {
    const { page, limit, skip } = paginationHelper.calculatePagination(options);
    const { searchTerm, ...filterData } = params;

    const andConditions: Prisma.UserWhereInput[] = [];

    if (params.searchTerm) {
        andConditions.push({
            OR: userSearchAbleFields.map(field => ({
                [field]: {
                    contains: params.searchTerm,
                    mode: 'insensitive'
                }
            }))
        });
    };

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map(key => ({
                [key]: {
                    equals: (filterData as any)[key]
                }
            }))
        });
    };

    const whereConditions: Prisma.UserWhereInput =
        andConditions.length > 0 ? { AND: andConditions } : {};

    const result = await prisma.user.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: options.sortBy && options.sortOrder
            ? { [options.sortBy]: options.sortOrder }
            : { createdAt: 'desc' },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            picture: true,
            role: true,
            needPasswordChange: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        }
    });

    const total = await prisma.user.count({
        where: whereConditions
    });

    return {
        meta: { page, limit, total },
        data: result
    };
};

const changeProfileStatus = async (
    id: number,
    payload: { status: UserStatus; },
    requester: { id: number; role: Role; }
) => {
    const target = await prisma.user.findUniqueOrThrow({
        where: { id }
    });

    if (target.id === requester.id) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You cannot change your own status");
    }
    if (target.role === Role.SUPER_ADMIN || (target.role === Role.ADMIN && requester.role !== Role.SUPER_ADMIN)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You cannot change the status of this account");
    }

    return prisma.user.update({
        where: { id },
        data: { status: payload.status },
        select: { id: true, email: true, name: true, role: true, status: true }
    });
};

const getMyProfile = async (user: IAuthUser) => {
    const userInfo = await prisma.user.findUniqueOrThrow({
        where: {
            email: user?.email,
            status: UserStatus.ACTIVE,
        },
        select: {
            id: true,
            email: true,
            needPasswordChange: true,
            role: true,
            status: true,
        },
    });

    const profileInfo = await prisma.user.findUnique({
        where: {
            email: userInfo.email,
        },
        select: {
            id: true,
            name: true,
            email: true,
            picture: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return { ...userInfo, ...profileInfo };
};

const updateMyProfie = async (user: IAuthUser, req: Request) => {
    const userInfo = await prisma.user.findUniqueOrThrow({
        where: {
            email: user?.email,
            status: UserStatus.ACTIVE
        }
    });

    req.body = req.body ?? {};

    const file = req.file;
    if (file) {
        const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
        req.body.picture = uploadToCloudinary?.secure_url;
    }

    const profileInfo = await prisma.user.update({
        where: {
            email: userInfo.email
        },
        data: req.body,
        select: { id: true, name: true, email: true, phone: true, picture: true, role: true, status: true }
    });

    return profileInfo;
};

export const userService = {
    createAdmin,
    getAllFromDB,
    changeProfileStatus,
    getMyProfile,
    updateMyProfie
};