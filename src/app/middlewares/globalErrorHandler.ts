import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import ApiError from "../errors/ApiError";

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
    let message: string = err.message || "Something went wrong!";
    let error: any = undefined;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
    } else if (err instanceof ZodError) {
        statusCode = httpStatus.BAD_REQUEST;
        message = "Validation Error";
        error = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = httpStatus.BAD_REQUEST;
        message = "Validation Error";
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = httpStatus.CONFLICT;
            message = "Duplicate value: this record already exists";
        } else if (err.code === "P2025") {
            statusCode = httpStatus.NOT_FOUND;
            message = "Record not found";
        } else if (err.code === "P2003") {
            statusCode = httpStatus.CONFLICT;
            message = "This record is in use by other records";
        } else if (err.code === "P2028" || err.code === "P1001" || err.code === "P1002") {
            statusCode = httpStatus.SERVICE_UNAVAILABLE;
            message = "The database is responding slowly. Nothing was saved, so please try again.";
        } else {
            message = "Database operation failed";
        }
    } else if (err.name === "MulterError" || err instanceof SyntaxError) {
        statusCode = httpStatus.BAD_REQUEST;
    } else if (process.env.NODE_ENV === "production") {
        message = "Something went wrong!";
    }

    if (statusCode >= 500) console.error(err);

    res.status(statusCode).json({ success: false, message, error });
};

export default globalErrorHandler;
