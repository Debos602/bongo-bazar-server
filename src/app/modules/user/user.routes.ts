import { Role } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import { fileUploader } from '../../../helpers/fileUploader';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { userController } from './user.controller';
import { updateProfileSchema, userValidation } from './user.validation';


const router = express.Router();

router.get(
    '/',
    auth(Role.SUPER_ADMIN, Role.ADMIN),
    userController.getAllFromDB
);
router.get(
    '/me',
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR, Role.USER),
    userController.getMyProfile
);

router.post(
    "/create-admin",
    auth(Role.SUPER_ADMIN, Role.ADMIN),
    fileUploader.upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = userValidation.createAdmin.parse(req.body?.data ? JSON.parse(req.body.data) : req.body);
        return userController.createAdmin(req, res, next);
    }
);




router.patch(
    '/:id/status',
    auth(Role.SUPER_ADMIN, Role.ADMIN),
    validateRequest(userValidation.updateStatus),
    userController.changeProfileStatus
);

router.patch(
    "/update-my-profile",
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR, Role.USER),
    fileUploader.upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = updateProfileSchema.parse(req.body?.data ? JSON.parse(req.body.data) : req.body);
        return userController.updateMyProfie(req, res, next);
    }
);


export const UserRoutes = router;