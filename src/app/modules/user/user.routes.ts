import { Role } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import { fileUploader } from '../../../helpers/fileUploader';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { userController } from './user.controller';
import { userValidation } from './user.validation';


const router = express.Router();

router.get(
    '/',
    auth(Role.SUPER_ADMIN, Role.ADMIN),
    userController.getAllFromDB
);
router.get(
    '/me',
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.USER),
    userController.getMyProfile
);

router.post(
    "/create-admin",
    auth(Role.SUPER_ADMIN, Role.ADMIN),
    fileUploader.upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = userValidation.createAdmin.parse(JSON.parse(req.body.data));
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
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.USER),
    fileUploader.upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = JSON.parse(req.body.data);
        return userController.updateMyProfie(req, res, next);
    }
);


export const userRoutes = router;