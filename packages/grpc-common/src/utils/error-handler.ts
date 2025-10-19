import { ServiceError, status, Metadata } from '@grpc/grpc-js';
import { GrpcError, GrpcStatusCode } from '../types/common';

/**
 * Convert gRPC service error to application error
 */
export function handleGrpcError(error: ServiceError): GrpcError {
    const grpcError: GrpcError = {
        name: 'GrpcError',
        message: error.message || 'Unknown gRPC error',
        code: error.code || status.UNKNOWN,
        details: error.details || error.message,
        metadata: error.metadata
    };

    return grpcError;
}

/**
 * Create gRPC error with proper status code
 */
export function createGrpcError(
    code: GrpcStatusCode,
    message: string,
    details?: any,
    metadata?: Metadata
): GrpcError {
    const error: GrpcError = {
        name: 'GrpcError',
        message,
        code,
        details: details || message,
        metadata
    };

    return error;
}

/**
 * Map application errors to gRPC status codes
 */
export function mapErrorToGrpcStatus(error: Error): GrpcStatusCode {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('not found')) {
        return GrpcStatusCode.NOT_FOUND;
    }

    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        return GrpcStatusCode.ALREADY_EXISTS;
    }

    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
        return GrpcStatusCode.UNAUTHENTICATED;
    }

    if (errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
        return GrpcStatusCode.PERMISSION_DENIED;
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        return GrpcStatusCode.INVALID_ARGUMENT;
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('deadline')) {
        return GrpcStatusCode.DEADLINE_EXCEEDED;
    }

    if (errorMessage.includes('unavailable') || errorMessage.includes('connection')) {
        return GrpcStatusCode.UNAVAILABLE;
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        return GrpcStatusCode.RESOURCE_EXHAUSTED;
    }

    return GrpcStatusCode.INTERNAL;
}

/**
 * Create standardized gRPC error response
 */
export function createGrpcErrorResponse(
    code: GrpcStatusCode,
    message: string,
    validationErrors?: any[],
    details?: any
) {
    return {
        success: false,
        message,
        validationErrors: validationErrors || [],
        error: {
            code: GrpcStatusCode[code],
            message,
            details
        }
    };
}

/**
 * Handle async gRPC method calls with error handling
 */
export async function handleAsyncGrpcCall<T>(
    operation: () => Promise<T>,
    errorContext?: string
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const context = errorContext ? ` in ${errorContext}` : '';

        if (error instanceof Error) {
            const grpcCode = mapErrorToGrpcStatus(error);
            throw createGrpcError(
                grpcCode,
                `${error.message}${context}`,
                error
            );
        }

        throw createGrpcError(
            GrpcStatusCode.INTERNAL,
            `Unknown error${context}`,
            error
        );
    }
}

/**
 * Validation error helper
 */
export function createValidationError(
    field: string,
    message: string,
    code: string = 'VALIDATION_ERROR'
) {
    return {
        field,
        message,
        code
    };
}

/**
 * Create validation errors response
 */
export function createValidationErrorResponse(
    validationErrors: Array<{ field: string; message: string; code?: string }>
) {
    return createGrpcErrorResponse(
        GrpcStatusCode.INVALID_ARGUMENT,
        'Validation failed',
        validationErrors
    );
}

/**
 * Not found error helper
 */
export function createNotFoundError(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    return createGrpcError(GrpcStatusCode.NOT_FOUND, message);
}

/**
 * Already exists error helper
 */
export function createAlreadyExistsError(resource: string, field?: string, value?: string) {
    let message = `${resource} already exists`;
    if (field && value) {
        message += ` with ${field} '${value}'`;
    }
    return createGrpcError(GrpcStatusCode.ALREADY_EXISTS, message);
}

/**
 * Permission denied error helper
 */
export function createPermissionDeniedError(action?: string, resource?: string) {
    let message = 'Permission denied';
    if (action && resource) {
        message += ` to ${action} ${resource}`;
    }
    return createGrpcError(GrpcStatusCode.PERMISSION_DENIED, message);
}

/**
 * Unauthenticated error helper
 */
export function createUnauthenticatedError(message: string = 'Authentication required') {
    return createGrpcError(GrpcStatusCode.UNAUTHENTICATED, message);
}

/**
 * Rate limit error helper
 */
export function createRateLimitError(limit?: number, window?: string) {
    let message = 'Rate limit exceeded';
    if (limit && window) {
        message += `. Maximum ${limit} requests per ${window}`;
    }
    return createGrpcError(GrpcStatusCode.RESOURCE_EXHAUSTED, message);
}

/**
 * Service unavailable error helper
 */
export function createServiceUnavailableError(service?: string) {
    const message = service ? `${service} service unavailable` : 'Service unavailable';
    return createGrpcError(GrpcStatusCode.UNAVAILABLE, message);
}

/**
 * Internal error helper
 */
export function createInternalError(message: string = 'Internal server error', details?: any) {
    return createGrpcError(GrpcStatusCode.INTERNAL, message, details);
}