import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/response-handler';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log error
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
    });

    // Handle known errors
    if (err.isOperational) {
        ResponseHandler.error(
            res,
            err.statusCode || 500,
            err.code || 'INTERNAL_ERROR',
            err.message
        );
        return;
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        ResponseHandler.badRequest(res, err.message);
        return;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        ResponseHandler.unauthorized(res, 'Invalid token');
        return;
    }

    if (err.name === 'TokenExpiredError') {
        ResponseHandler.unauthorized(res, 'Token expired');
        return;
    }

    // Handle MongoDB duplicate key error
    if (err.name === 'MongoError' && (err as any).code === 11000) {
        ResponseHandler.conflict(res, 'Resource already exists');
        return;
    }

    // Default error
    ResponseHandler.internalError(
        res,
        process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    );
};