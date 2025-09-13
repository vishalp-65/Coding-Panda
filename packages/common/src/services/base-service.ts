import { logger } from '../index';

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export abstract class BaseService {
    protected logger = logger;

    protected createPaginatedResult<T>(
        data: T[],
        total: number,
        options: PaginationOptions
    ): PaginatedResult<T> {
        const totalPages = Math.ceil(total / options.limit);

        return {
            data,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                totalPages,
            },
        };
    }

    protected handleServiceError(error: Error, operation: string): never {
        this.logger.error(`${operation} failed:`, error);

        // Re-throw with additional context
        const serviceError = new Error(`${operation}: ${error.message}`);
        (serviceError as any).originalError = error;
        throw serviceError;
    }

    protected validateId(id: string, entityName: string = 'Entity'): void {
        if (!id || id.trim().length === 0) {
            throw new Error(`${entityName} ID is required`);
        }
    }

    protected sanitizeInput(input: any): any {
        if (typeof input === 'string') {
            return input.trim();
        }

        if (Array.isArray(input)) {
            return input.map(item => this.sanitizeInput(item));
        }

        if (input && typeof input === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = this.sanitizeInput(value);
            }
            return sanitized;
        }

        return input;
    }
}