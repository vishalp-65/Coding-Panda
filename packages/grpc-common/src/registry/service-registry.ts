import { EventEmitter } from 'events';

export interface ServiceInfo {
    name: string;
    host: string;
    port: number;
    protocol: 'grpc' | 'http';
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastSeen: Date;
    metadata?: Record<string, any>;
}

export class ServiceRegistry extends EventEmitter {
    private services: Map<string, ServiceInfo> = new Map();
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
    private readonly SERVICE_TIMEOUT = 60000; // 1 minute

    constructor() {
        super();
        this.startHealthChecking();
    }

    /**
     * Register a service
     */
    register(service: ServiceInfo): void {
        const key = `${service.name}:${service.host}:${service.port}`;
        const existingService = this.services.get(key);

        service.lastSeen = new Date();
        this.services.set(key, service);

        if (!existingService) {
            this.emit('serviceRegistered', service);
            console.log(`Service registered: ${service.name} at ${service.host}:${service.port}`);
        } else {
            this.emit('serviceUpdated', service);
        }
    }

    /**
     * Unregister a service
     */
    unregister(name: string, host: string, port: number): void {
        const key = `${name}:${host}:${port}`;
        const service = this.services.get(key);

        if (service) {
            this.services.delete(key);
            this.emit('serviceUnregistered', service);
            console.log(`Service unregistered: ${name} at ${host}:${port}`);
        }
    }

    /**
     * Get all services by name
     */
    getServices(name: string): ServiceInfo[] {
        return Array.from(this.services.values())
            .filter(service => service.name === name && service.health === 'healthy');
    }

    /**
     * Get a specific service
     */
    getService(name: string, host: string, port: number): ServiceInfo | undefined {
        const key = `${name}:${host}:${port}`;
        return this.services.get(key);
    }

    /**
     * Get all registered services
     */
    getAllServices(): ServiceInfo[] {
        return Array.from(this.services.values());
    }

    /**
     * Get healthy services by name
     */
    getHealthyServices(name: string): ServiceInfo[] {
        return this.getServices(name).filter(service => service.health === 'healthy');
    }

    /**
     * Get a random healthy service (load balancing)
     */
    getRandomHealthyService(name: string): ServiceInfo | undefined {
        const healthyServices = this.getHealthyServices(name);
        if (healthyServices.length === 0) {
            return undefined;
        }

        const randomIndex = Math.floor(Math.random() * healthyServices.length);
        return healthyServices[randomIndex];
    }

    /**
     * Update service health status
     */
    updateServiceHealth(name: string, host: string, port: number, health: 'healthy' | 'unhealthy'): void {
        const key = `${name}:${host}:${port}`;
        const service = this.services.get(key);

        if (service) {
            const oldHealth = service.health;
            service.health = health;
            service.lastSeen = new Date();

            if (oldHealth !== health) {
                this.emit('serviceHealthChanged', service, oldHealth);
                console.log(`Service health changed: ${name} at ${host}:${port} is now ${health}`);
            }
        }
    }

    /**
     * Start periodic health checking
     */
    private startHealthChecking(): void {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthChecks();
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
     * Perform health checks on all services
     */
    private performHealthChecks(): void {
        const now = new Date();
        const expiredServices: string[] = [];

        for (const [key, service] of this.services.entries()) {
            const timeSinceLastSeen = now.getTime() - service.lastSeen.getTime();

            if (timeSinceLastSeen > this.SERVICE_TIMEOUT) {
                expiredServices.push(key);
            }
        }

        // Remove expired services
        for (const key of expiredServices) {
            const service = this.services.get(key);
            if (service) {
                this.services.delete(key);
                this.emit('serviceExpired', service);
                console.log(`Service expired: ${service.name} at ${service.host}:${service.port}`);
            }
        }
    }

    /**
     * Clear all services
     */
    clear(): void {
        this.services.clear();
        this.emit('registryCleared');
    }

    /**
     * Get service statistics
     */
    getStats(): {
        totalServices: number;
        healthyServices: number;
        unhealthyServices: number;
        servicesByName: Record<string, number>;
    } {
        const services = Array.from(this.services.values());
        const servicesByName: Record<string, number> = {};

        for (const service of services) {
            servicesByName[service.name] = (servicesByName[service.name] || 0) + 1;
        }

        return {
            totalServices: services.length,
            healthyServices: services.filter(s => s.health === 'healthy').length,
            unhealthyServices: services.filter(s => s.health === 'unhealthy').length,
            servicesByName
        };
    }

    /**
     * Destroy the registry
     */
    destroy(): void {
        this.stopHealthChecking();
        this.clear();
        this.removeAllListeners();
    }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();