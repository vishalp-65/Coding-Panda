import {
    Server,
    ServerCredentials,
    UntypedServiceImplementation,
    status
} from '@grpc/grpc-js';
import { GrpcServerConfig, ServiceHealth, ServiceStatus } from '../types/common';

export class GrpcServer {
    private server: Server;
    private config: GrpcServerConfig;
    private services: Map<string, UntypedServiceImplementation> = new Map();
    private health: ServiceHealth;

    constructor(config: GrpcServerConfig) {
        this.config = config;
        this.server = new Server(config.options);
        this.health = {
            service: 'unknown',
            status: ServiceStatus.HEALTHY,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: 0
        };

        // Add default interceptors
        this.addInterceptors();
    }

    /**
     * Add service to the server
     */
    addService(
        serviceDefinition: any,
        implementation: UntypedServiceImplementation,
        serviceName: string
    ): void {
        this.server.addService(serviceDefinition, implementation);
        this.services.set(serviceName, implementation);
        this.health.service = serviceName;
    }

    /**
     * Add interceptors to the server
     */
    private addInterceptors(): void {
        // Interceptors will be added here when needed
        // For now, just initialize the server
    }

    /**
     * Start the gRPC server
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.bindAsync(
                `0.0.0.0:${this.config.port}`,
                this.config.credentials || ServerCredentials.createInsecure(),
                (error, port) => {
                    if (error) {
                        reject(error);
                    } else {
                        this.server.start();
                        this.health.status = ServiceStatus.HEALTHY;
                        this.health.timestamp = new Date().toISOString();
                        console.log(`gRPC server started on port ${port}`);
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Stop the gRPC server gracefully
     */
    async stop(): Promise<void> {
        return new Promise((resolve) => {
            this.server.tryShutdown((error) => {
                if (error) {
                    console.error('Error during graceful shutdown:', error);
                    this.server.forceShutdown();
                }
                this.health.status = ServiceStatus.UNHEALTHY;
                resolve();
            });
        });
    }

    /**
     * Force stop the server
     */
    forceStop(): void {
        this.server.forceShutdown();
        this.health.status = ServiceStatus.UNHEALTHY;
    }

    /**
     * Get server health status
     */
    getHealth(): ServiceHealth {
        return {
            ...this.health,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * Update service health status
     */
    updateHealthStatus(status: ServiceStatus): void {
        this.health.status = status;
        this.health.timestamp = new Date().toISOString();
    }

    /**
     * Get registered services
     */
    getServices(): string[] {
        return Array.from(this.services.keys());
    }
}

/**
 * Create a standard health check implementation
 */
export function createHealthCheckImplementation(server: GrpcServer) {
    return {
        healthCheck: (_call: any, callback: any) => {
            const health = server.getHealth();

            const response = {
                service: health.service,
                status: health.status,
                version: health.version,
                timestamp: health.timestamp,
                uptime: health.uptime
            };

            callback(null, response);
        }
    };
}

/**
 * Create error response helper
 */
export function createErrorResponse(
    code: status,
    message: string,
    details?: any
) {
    const error = new Error(message) as any;
    error.code = code;
    error.details = details;
    return error;
}

/**
 * Validate required fields in gRPC request
 */
export function validateGrpcRequiredFields(
    request: any,
    requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
        if (!request[field] || (typeof request[field] === 'string' && request[field].trim() === '')) {
            missingFields.push(field);
        }
    }

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}

/**
 * Create pagination response
 */
export function createPaginationResponse(
    total: number,
    limit: number,
    offset: number
) {
    return {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
    };
}

/**
 * Extract metadata from gRPC call
 */
export function extractMetadata(call: any) {
    const metadata = call.metadata;

    return {
        requestId: metadata.get('request-id')?.[0] || 'unknown',
        userId: metadata.get('user-id')?.[0],
        userEmail: metadata.get('user-email')?.[0],
        userRoles: metadata.get('user-roles')?.[0] ?
            JSON.parse(metadata.get('user-roles')[0] as string) : [],
        sessionId: metadata.get('session-id')?.[0],
        ipAddress: metadata.get('ip-address')?.[0],
        userAgent: metadata.get('user-agent')?.[0]
    };
}

/**
 * Create base response
 */
export function createBaseResponse(
    success: boolean = true,
    message?: string,
    validationErrors?: any[],
    error?: any
) {
    return {
        success,
        message,
        validationErrors: validationErrors || [],
        error
    };
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server: GrpcServer): void {
    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}. Starting graceful shutdown...`);

        try {
            await server.stop();
            console.log('gRPC server stopped gracefully');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            server.forceStop();
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        server.updateHealthStatus(ServiceStatus.UNHEALTHY);
        server.forceStop();
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        server.updateHealthStatus(ServiceStatus.DEGRADED);
    });
}