import { Request, Response } from 'express';
import { ResponseHandler } from '../utils/response-handler';
import { ValidationUtils } from '../utils/validation';
import { asyncHandler } from '../utils/async-handler';

export interface AuthenticatedUser {
    id: string;
    email?: string;
    role?: string;
}

export interface ValidatedRequest extends Request {
    user?: AuthenticatedUser;
    validatedBody?: any;
    validatedQuery?: any;
}

export abstract class BaseController {
    protected validateAuth(req: ValidatedRequest, res: Response): boolean {
        if (!req.user?.id) {
            ResponseHandler.unauthorized(res, 'Authentication required');
            return false;
        }
        return true;
    }

    protected validatePagination(req: Request): { page: number; limit: number } {
        return ValidationUtils.validatePagination(
            req.query.page as string,
            req.query.limit as string
        );
    }

    protected validateId(id: string, fieldName: string = 'ID'): void {
        ValidationUtils.validateRequired(id, fieldName);
    }

    protected handleServiceError(error: Error, defaultMessage: string): never {
        if (error.message.includes('not found')) {
            const notFoundError = new Error('Resource not found');
            (notFoundError as any).statusCode = 404;
            (notFoundError as any).isOperational = true;
            throw notFoundError;
        }

        if (error.message.includes('already exists')) {
            const conflictError = new Error(error.message);
            (conflictError as any).statusCode = 409;
            (conflictError as any).isOperational = true;
            throw conflictError;
        }

        throw error;
    }

    protected sendSuccessResponse(res: Response, data?: any, message?: string): void {
        ResponseHandler.success(res, data, message);
    }

    protected sendErrorResponse(res: Response, statusCode: number, code: string, message: string): void {
        ResponseHandler.error(res, statusCode, code, message);
    }

    protected sendCreatedResponse(res: Response, data: any, message?: string): void {
        ResponseHandler.created(res, data, message);
    }

    protected sendNotFoundResponse(res: Response, message?: string): void {
        ResponseHandler.notFound(res, message);
    }

    protected sendBadRequestResponse(res: Response, message?: string): void {
        ResponseHandler.badRequest(res, message);
    }

    protected sendUnauthorizedResponse(res: Response, message?: string): void {
        ResponseHandler.unauthorized(res, message);
    }

    protected sendConflictResponse(res: Response, message?: string): void {
        ResponseHandler.conflict(res, message);
    }

    protected sendInternalErrorResponse(res: Response, message?: string): void {
        ResponseHandler.internalError(res, message);
    }
}