import { Response } from 'express';
import { HTTP_STATUS, ERROR_CODES } from '../constants/http-status';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        timestamp: string;
    };
}

export class ResponseHandler {
    static success<T>(
        res: Response,
        data?: T,
        message?: string,
        statusCode: number = HTTP_STATUS.OK,
        pagination?: any
    ): void {
        const response: ApiResponse<T> = {
            success: true,
            ...(data !== undefined && { data }),
            ...(message && { message }),
            ...(pagination && { pagination }),
        };
        res.status(statusCode).json(response);
    }

    static error(
        res: Response,
        statusCode: number,
        code: string,
        message: string
    ): void {
        const response: ApiError = {
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
            },
        };
        res.status(statusCode).json(response);
    }

    static badRequest(res: Response, message: string = 'Bad request'): void {
        this.error(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message);
    }

    static unauthorized(res: Response, message: string = 'Unauthorized'): void {
        this.error(res, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, message);
    }

    static forbidden(res: Response, message: string = 'Forbidden'): void {
        this.error(res, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
    }

    static notFound(res: Response, message: string = 'Resource not found'): void {
        this.error(res, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, message);
    }

    static conflict(res: Response, message: string = 'Resource already exists'): void {
        this.error(res, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, message);
    }

    static internalError(res: Response, message: string = 'Internal server error'): void {
        this.error(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, message);
    }

    static created<T>(res: Response, data?: T, message: string = 'Resource created successfully'): void {
        this.success(res, data, message, HTTP_STATUS.CREATED);
    }
}