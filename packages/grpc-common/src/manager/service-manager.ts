import { EventEmitter } from 'events';
import { serviceRegistry, ServiceInfo } from '../registry/service-registry';
import { GrpcClient, createGrpcClient, checkServiceHealth } from '../utils/client';
import { RequestMetadata } from '../types/common';

export interface ServiceClientConfig {
    serviceName: string;
    clientConstructor: any;
    defaultHost?: string;
    defaultPort?: number;
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
}

export class ServiceManager extends EventEmitter {
    private clients: Map<string, any> = new Map();
    private clientConfigs: Map<string, ServiceClientConfig> = new Map();
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

    constructor() {
        super();
        this.startHealthChecking();
        this.setupRegistryListeners();
    }

    /**
     * Register a service client configuration
     */
    registerService(config: ServiceClientConfig): void {
        this.clientConfigs.set(config.serviceName, config);
        console.log(`Service client registered: ${config.serviceName}`);
    }

    /**
     * Get a client for a service
     */
    getClient<T>(serviceName: string): T | null {
        const existingClient = this.clients.get(serviceName);
        if (existingClient) {
            return existingClient;
        }

        const config = this.clientConfigs.get(serviceName);
        if (!config) {
            console.error(`No client configuration found for service: ${serviceName}`);
            return null;
        }

        // Try to get a healthy service from registry
        let serviceInfo = serviceRegistry.getRandomHealthyService(serviceName);

        // Fallback to default configuration
        if (!serviceInfo && config.defaultHost && config.defaultPort) {
            serviceInfo = {
                name: serviceName,
                host: config.defaultHost,
                port: config.defaultPort,
                protocol: 'grpc' as const,
                health: 'unknown' as const,
                lastSeen: new Date()
            };
        }

        if (!serviceInfo) {
            console.error(`No healthy service found for: ${serviceName}`);
            return null;
        }

        try {
            const client = createGrpcClient(config.clientConstructor, {
                host: serviceInfo.host,
                port: serviceInfo.port,
                options: {
                    'grpc.max_receive_message_length': 4 * 1024 * 1024,
                    'grpc.max_send_message_length': 4 * 1024 * 1024,
                    'grpc.keepalive_time_ms': 30000,
                    'grpc.keepalive_timeout_ms': 5000,
                }
            });

            this.clients.set(serviceName, client);
            this.emit('clientCreated', serviceName, serviceInfo);

            console.log(`Client created for ${serviceName} at ${serviceInfo.host}:${serviceInfo.port}`);
            return client;
        } catch (error) {
            console.error(`Failed to create client for ${serviceName}:`, error);
            return null;
        }
    }

    /**
     * Make a resilient call to a service with retry logic
     */
    async makeResilientCall<T>(
        serviceName: string,
        methodName: string,
        request: any,
        metadata?: Partial<RequestMetadata>
    ): Promise<T> {
        const config = this.clientConfigs.get(serviceName);
        if (!config) {
            throw new Error(`No client configuration found for service: ${serviceName}`);
        }

        const maxRetries = config.maxRetries || 3;
        const retryDelay = config.retryDelay || 1000;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const client = this.getClient(serviceName);
                if (!client) {
                    throw new Error(`Failed to get client for service: ${serviceName}`);
                }

                // Check if method exists on client
                if (typeof client[methodName] !== 'function') {
                    throw new Error(`Method ${methodName} not found on ${serviceName} client`);
                }

                // Make the call
                const result = await new Promise<T>((resolve, reject) => {
                    const grpcClient = new GrpcClient(config.clientConstructor, {
                        host: 'localhost', // This will be replaced by service discovery
                        port: config.defaultPort || 50051
                    });

                    grpcClient.makeUnaryCall(
                        client[methodName].bind(client),
                        request,
                        metadata
                    ).then(resolve).catch(reject);
                });

                return result;
            } catch (error) {
                lastError = error as Error;
                console.warn(`Attempt ${attempt + 1} failed for ${serviceName}.${methodName}:`, error);

                if (attempt < maxRetries) {
                    // Remove failed client
                    this.clients.delete(serviceName);

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                }
            }
        }

        throw lastError || new Error(`All retry attempts failed for ${serviceName}.${methodName}`);
    }

    /**
     * Close a specific client
     */
    closeClient(serviceName: string): void {
        const client = this.clients.get(serviceName);
        if (client && typeof client.close === 'function') {
            client.close();
            this.clients.delete(serviceName);
            this.emit('clientClosed', serviceName);
            console.log(`Client closed for service: ${serviceName}`);
        }
    }

    /**
     * Close all clients
     */
    closeAllClients(): void {
        for (const [serviceName, client] of this.clients.entries()) {
            if (client && typeof client.close === 'function') {
                client.close();
            }
        }
        this.clients.clear();
        this.emit('allClientsClosed');
        console.log('All service clients closed');
    }

    /**
     * Get client statistics
     */
    getStats(): {
        totalClients: number;
        activeClients: string[];
        registeredServices: string[];
    } {
        return {
            totalClients: this.clients.size,
            activeClients: Array.from(this.clients.keys()),
            registeredServices: Array.from(this.clientConfigs.keys())
        };
    }

    /**
     * Setup service registry event listeners
     */
    private setupRegistryListeners(): void {
        serviceRegistry.on('serviceHealthChanged', (service: ServiceInfo, oldHealth: string) => {
            if (service.health === 'unhealthy' && oldHealth === 'healthy') {
                // Close client for unhealthy service
                this.closeClient(service.name);
            }
        });

        serviceRegistry.on('serviceExpired', (service: ServiceInfo) => {
            // Close client for expired service
            this.closeClient(service.name);
        });
    }

    /**
     * Start periodic health checking of clients
     */
    private startHealthChecking(): void {
        this.healthCheckInterval = setInterval(async () => {
            await this.performClientHealthChecks();
        }, this.HEALTH_CHECK_INTERVAL);
    }

    /**
     * Stop health checking
     */
    stopHealthChecking(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Perform health checks on all active clients
     */
    private async performClientHealthChecks(): Promise<void> {
        const healthCheckPromises: Promise<void>[] = [];

        for (const [serviceName, client] of this.clients.entries()) {
            healthCheckPromises.push(
                this.checkClientHealth(serviceName, client)
            );
        }

        await Promise.allSettled(healthCheckPromises);
    }

    /**
     * Check health of a specific client
     */
    private async checkClientHealth(serviceName: string, client: any): Promise<void> {
        try {
            const isHealthy = await checkServiceHealth(client, 5000);

            if (!isHealthy) {
                console.warn(`Health check failed for ${serviceName}, removing client`);
                this.closeClient(serviceName);
            }
        } catch (error) {
            console.error(`Health check error for ${serviceName}:`, error);
            this.closeClient(serviceName);
        }
    }

    /**
     * Destroy the service manager
     */
    destroy(): void {
        this.stopHealthChecking();
        this.closeAllClients();
        this.clientConfigs.clear();
        this.removeAllListeners();
    }
}

// Singleton instance
export const serviceManager = new ServiceManager();