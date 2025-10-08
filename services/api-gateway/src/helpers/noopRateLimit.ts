// helpers/noopRateLimit.ts
import { Request, Response, NextFunction } from 'express';

export const noopRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(); // just bypass
};
