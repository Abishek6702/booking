import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export const validateRequest = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      // Log only the validation errors — never the request body (may contain passwords/tokens/PII)
      next(parsed.error);
      return;
    }

    if (parsed.data.body !== undefined) {
      req.body = parsed.data.body;
    }

    next();
  };
};
