import { Metadata } from '@grpc/grpc-js';

export interface GrpcServiceConfig {
    host: string;
    port: number;
    credentials?: any;
    options?: any;
}

export interface GrpcServerConfig {
    port: number;
    credentials?: any;
    options?: any;
}

export interface RequestMetadata {
    requestId: string;
    userId?: string;
    userEmail?: string;
    userRoles?: string[];
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface GrpcError extends Error {
    code: number;
    details: string;
    metadata?: Metadata;
}

export interface ServiceHealth {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    version: string;
    timestamp: string;
    uptime: number;
}

export interface PaginationOptions {
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface BaseResponse {
    success: boolean;
    message?: string;
    validationErrors?: ValidationError[];
    error?: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
}

export enum ServiceStatus {
    HEALTHY = 'healthy',
    UNHEALTHY = 'unhealthy',
    DEGRADED = 'degraded'
}

export enum GrpcStatusCode {
    OK = 0,
    CANCELLED = 1,
    UNKNOWN = 2,
    INVALID_ARGUMENT = 3,
    DEADLINE_EXCEEDED = 4,
    NOT_FOUND = 5,
    ALREADY_EXISTS = 6,
    PERMISSION_DENIED = 7,
    RESOURCE_EXHAUSTED = 8,
    FAILED_PRECONDITION = 9,
    ABORTED = 10,
    OUT_OF_RANGE = 11,
    UNIMPLEMENTED = 12,
    INTERNAL = 13,
    UNAVAILABLE = 14,
    DATA_LOSS = 15,
    UNAUTHENTICATED = 16
}