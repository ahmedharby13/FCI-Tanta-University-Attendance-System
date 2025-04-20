import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodObject<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errorMessage = err.errors.map(e => e.message).join(', ');
        return next(new Error(`Validation failed: ${errorMessage}`));
      }
      next(err);
    }
  };
};