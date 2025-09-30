import { Request, Response } from 'express';

export interface HealthCheck {
    name: string;
    check: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: any;
    responseTime?: number;
}

export interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    version: string;
    service: string;
    checks: Record<string, HealthCheckResult>;
}

export class HealthManager {
    private checks: Map<string, HealthCheck> = new Map();
    private serviceName: string;
    private version: string;
    private startTime: number;

    constructor(serviceName: string, version: string = '1.0.0') {
        this.serviceName = serviceName;
        this.version = version;
        this.startTime = Date.now();
    }

    // Register a health check
    registerCheck(check: HealthCheck) {
        this.checks.set(check.name, check);
    }

    // Remove a health check
    unregisterCheck(name: string) {
        this.checks.delete(name);
    }

    // Run all health checks
    async runHealthChecks(): Promise<HealthStatus> {
        const results: Record<string, HealthCheckResult> = {};
        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

        for (const [name, check] of this.checks) {
            try {
                const start = Date.now();
                const result = await check.check();
                result.responseTime = Date.now() - start;
                results[name] = result;

                // Determine overall status
                if (result.status === 'unhealthy') {
                    overallStatus = 'unhealthy';
                } else if (result.status === 'degraded' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    responseTime: Date.now() - Date.now(),
                };
                overallStatus = 'unhealthy';
            }
        }

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            version: this.version,
            service: this.serviceName,
            checks: results,
        };
    }

    // Express middleware for health endpoint
    healthEndpoint() {
        return async (req: Request, res: Response) => {
            try {
                const health = await this.runHealthChecks();
                const statusCode = health.status === 'healthy' ? 200 :
                    health.status === 'degraded' ? 200 : 503;

                res.status(statusCode).json(health);
            } catch (error) {
                res.status(500).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    uptime: Date.now() - this.startTime,
                    version: this.version,
                    service: this.serviceName,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    checks: {},
                });
            }
        };
    }

    // Simple liveness probe (always returns 200 if service is running)
    livenessProbe() {
        return (req: Request, res: Response) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime,
                service: this.serviceName,
            });
        };
    }

    // Readiness probe (returns 200 only if service is ready to handle requests)
    readinessProbe() {
        return async (req: Request, res: Response) => {
            try {
                const health = await this.runHealthChecks();
                const isReady = health.status === 'healthy' || health.status === 'degraded';

                res.status(isReady ? 200 : 503).json({
                    status: isReady ? 'ready' : 'not_ready',
                    timestamp: new Date().toISOString(),
                    service: this.serviceName,
                    checks: health.checks,
                });
            } catch (error) {
                res.status(503).json({
                    status: 'not_ready',
                    timestamp: new Date().toISOString(),
                    service: this.serviceName,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        };
    }
}

// Common health check implementations
export class DatabaseHealthCheck implements HealthCheck {
    name = 'database';

    constructor(private checkConnection: () => Promise<boolean>) { }

    async check(): Promise<HealthCheckResult> {
        try {
            const isConnected = await this.checkConnection();
            return {
                status: isConnected ? 'healthy' : 'unhealthy',
                message: isConnected ? 'Database connection is healthy' : 'Database connection failed',
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}

export class RedisHealthCheck implements HealthCheck {
    name = 'redis';

    constructor(private redisClient: any) { }

    async check(): Promise<HealthCheckResult> {
        try {
            await this.redisClient.ping();
            return {
                status: 'healthy',
                message: 'Redis connection is healthy',
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Redis check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}

export class ExternalServiceHealthCheck implements HealthCheck {
    constructor(
        public name: string,
        private url: string,
        private timeout: number = 5000
    ) { }

    async check(): Promise<HealthCheckResult> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(this.url, {
                signal: controller.signal,
                method: 'GET',
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                return {
                    status: 'healthy',
                    message: `External service ${this.name} is healthy`,
                    details: { status: response.status },
                };
            } else {
                return {
                    status: 'degraded',
                    message: `External service ${this.name} returned ${response.status}`,
                    details: { status: response.status },
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `External service ${this.name} check failed: ${error instanceof Error ? error.message : 'Unknown error'
                    }`,
            };
        }
    }
}

export class MemoryHealthCheck implements HealthCheck {
    name = 'memory';

    constructor(private thresholdPercent: number = 90) { }

    async check(): Promise<HealthCheckResult> {
        const memUsage = process.memoryUsage();
        const totalMem = memUsage.heapTotal;
        const usedMem = memUsage.heapUsed;
        const usagePercent = (usedMem / totalMem) * 100;

        const status = usagePercent > this.thresholdPercent ? 'degraded' : 'healthy';

        return {
            status,
            message: `Memory usage: ${usagePercent.toFixed(2)}%`,
            details: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss,
                usagePercent: usagePercent.toFixed(2),
            },
        };
    }
}

export class DiskSpaceHealthCheck implements HealthCheck {
    name = 'disk';

    constructor(private thresholdPercent: number = 90) { }

    async check(): Promise<HealthCheckResult> {
        try {
            const fs = require('fs');
            const stats = fs.statSync('/');
            // This is a simplified check - in production, you'd want to use a proper disk space library
            return {
                status: 'healthy',
                message: 'Disk space check not implemented',
                details: { note: 'Implement proper disk space checking' },
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Disk space check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}