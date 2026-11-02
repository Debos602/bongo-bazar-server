import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

// Replaces req.body with the parsed value, so unknown fields never reach a service.
const validateRequest = (schema: ZodObject<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed: any = await schema.parseAsync({ body: req.body });
        req.body = parsed.body;
        return next();
    } catch (err) {
        next(err);
    }
};

export default validateRequest;
