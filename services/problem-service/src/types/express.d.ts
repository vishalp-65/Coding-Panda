import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        roles?: string[];
      };
      validatedBody?: any;
      validatedQuery?: any;
    }
  }
}

export {};