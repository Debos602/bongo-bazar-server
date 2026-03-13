import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import config from "../../config";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import ApiError from "../errors/ApiError";


const auth = (...roles: string[]) => {
    return async (req: Request & { user?: any; }, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization || req.cookies.accessToken;
            console.log({ authHeader }, "from auth guard");

            const token = req.headers.authorization?.split(" ")[1];

            if (!token) {
                throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
            }

            const verifiedUser = jwtHelpers.verifyToken(token, config.jwt.jwt_secret as Secret);
            console.log({ verifiedUser }, "from auth guard after verification");
            req.user = verifiedUser;

            if (roles.length && !roles.includes(verifiedUser.role)) {
                throw new ApiError(httpStatus.FORBIDDEN, "Forbidden!");
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};

export default auth;