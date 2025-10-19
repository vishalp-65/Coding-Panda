import {
    credentials,
    Client,
    ClientOptions,
    Metadata,
    ServiceError,
    status
} from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import { GrpcServiceConfig, RequestMetadata, GrpcError } from '../types/common';
import { createMetadata } from './metadata';
import { handleGrpcError } from './error-handler';

export class GrpcClient {
    private client: Client;
    private config: GrpcServiceConfig;

    constructor(
        ClientConstructor: new (address: string, credentials: any, options?: ClientOptions) => Client,
        config: GrpcServiceConfig
    ) {
        this.config = config;
        const address = `${config.host}:${config.port}`;
        const creds = config.credentials || credentials.createInsecure();

        this.client = new ClientConstructor(address, creds, config.options);
    }

    /**
     * Create metadata for gRPC requests
     */
    createRequestMetadata(metadata?: Partial<RequestMetadata>): Metadata {
        const requestMetadata: RequestMetadata = {
            requestId: uuidv4(),
            ...metadata
        };

        return createMetadata(requestMetadata);
    }

    /**
     * Make a unary gRPC call with error handling
     */
    async makeUnaryCall<TRequest, TResponse>(
        method: (request: TRequest, metadata: Metadata, callback: (error: ServiceError | null, response?: TResponse) => void) => void,
        request: TRequest,
        metadata?: Partial<RequestMetadata>
    ): Promise<TResponse> {
        return new Promise((resolve, reject) => {
            const grpcMetadata = this.createRequestMetadata(metadata);

            method.call(this.client, request, grpcMetadata, (error: ServiceError | null, response?: TResponse) => {
                if (error) {
                    reject(handleGrpcError(error));
                } else if (response) {
                    resolve(response);
                } else {
                    reject(new Error('No response received'));
                }
            });
        });
    }

    /**
     * Make a server streaming gRPC call
     */
    makeServerStreamingCall<TRequest, TResponse>(
        method: (request: TRequest, metadata: Metadata) => any,
        request: TRequest,
        metadata?: Partial<RequestMetadata>
    ) {
        const grpcMetadata = this.createRequestMetadata(metadata);
        return method.call(this.client, request, grpcMetadata);
    }

    /**
     * Make a client streaming gRPC call
     */
    makeClientStreamingCall<TRequest, TResponse>(
        method: (metadata: Metadata, callback: (error: ServiceError | null, response?: TResponse) => void) => any,
        metadata?: Partial<RequestMetadata>
    ) {
        const grpcMetadata = this.createRequestMetadata(metadata);
        return method.call(this.client, grpcMetadata, (error: ServiceError | null, response?: TResponse) => {
            if (error) {
                throw handleGrpcError(error);
            }
            return response;
        });
    }

    /**
     * Make a bidirectional streaming gRPC call
     */
    makeBidirectionalStreamingCall<TRequest, TResponse>(
        method: (metadata: Metadata) => any,
        metadata?: Partial<RequestMetadata>
    ) {
        const grpcMetadata = this.createRequestMetadata(metadata);
        return method.call(this.client, grpcMetadata);
    }

    /**
     * Close the client connection
     */
    close(): void {
        this.client.close();
    }

    /**
     * Wait for the client to be ready
     */
    async waitForReady(deadline?: Date): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.waitForReady(deadline || new Date(Date.now() + 5000), (error) => {
                if (error) {
                    reject(handleGrpcError(error));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Get the current connectivity state
     */
    getConnectivityState(tryToConnect?: boolean): number {
        return this.client.getChannel().getConnectivityState(tryToConnect);
    }
}

/**
 * Create a gRPC client with retry logic and connection pooling
 */
export function createGrpcClient<T extends Client>(
    ClientConstructor: new (address: string, credentials: any, options?: ClientOptions) => T,
    config: GrpcServiceConfig
): T {
    const address = `${config.host}:${config.port}`;
    const creds = config.credentials || credentials.createInsecure();

    const options: ClientOptions = {
        'grpc.keepalive_time_ms': 30000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': true,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.http2.min_time_between_pings_ms': 10000,
        'grpc.http2.min_ping_interval_without_data_ms': 300000,
        'grpc.max_connection_idle_ms': 300000,
        'grpc.max_connection_age_ms': 300000,
        'grpc.max_connection_age_grace_ms': 30000,
        ...config.options
    };

    return new ClientConstructor(address, creds, options);
}

/**
 * Health check utility for gRPC services
 */
export async function checkServiceHealth(
    client: any,
    timeout: number = 5000
): Promise<boolean> {
    try {
        const deadline = new Date(Date.now() + timeout);
        await new Promise<void>((resolve, reject) => {
            client.waitForReady(deadline, (error: Error | null) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
        return true;
    } catch (error) {
        return false;
    }
}