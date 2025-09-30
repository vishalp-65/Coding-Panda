import { MetricsCollector } from './metrics';
import { Logger } from './logging';

export interface SystemMetrics {
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    cpu: {
        user: number;
        system: number;
    };
    uptime: number;
    loadAverage?: number[];
}

export class SystemMonitor {
    private metricsCollector: MetricsCollector;
    private logger: Logger;
    private intervalId?: NodeJS.Timeout;

    constructor(metricsCollector: MetricsCollector, logger: Logger) {
        this.metricsCollector = metricsCollector;
        this.logger = logger;
    }

    /**
     * Start collecting system metrics at regular intervals
     */
    startCollection(intervalMs: number = 30000): void {
        if (this.intervalId) {
            this.logger.warn('System metrics collection already started');
            return;
        }

        this.logger.info('Starting system metrics collection', { intervalMs });

        this.intervalId = setInterval(() => {
            try {
                this.collectMetrics();
            } catch (error) {
                this.logger.error('Error collecting system metrics', error as Error);
            }
        }, intervalMs);

        // Collect initial metrics
        this.collectMetrics();
    }

    /**
     * Stop collecting system metrics
     */
    stopCollection(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            this.logger.info('Stopped system metrics collection');
        }
    }

    /**
     * Collect current system metrics
     */
    collectMetrics(): SystemMetrics {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();

        const metrics: SystemMetrics = {
            memory: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss,
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system,
            },
            uptime,
        };

        // Add load average on Unix systems
        try {
            const os = require('os');
            if (os.loadavg) {
                metrics.loadAverage = os.loadavg();
            }
        } catch (error) {
            // Load average not available on Windows
        }

        // Update metrics
        this.metricsCollector.updateMemoryUsage('heap_used', metrics.memory.heapUsed);
        this.metricsCollector.updateMemoryUsage('heap_total', metrics.memory.heapTotal);
        this.metricsCollector.updateMemoryUsage('external', metrics.memory.external);
        this.metricsCollector.updateMemoryUsage('rss', metrics.memory.rss);

        // Calculate CPU percentage (simplified)
        const totalCpu = metrics.cpu.user + metrics.cpu.system;
        const cpuPercent = (totalCpu / (uptime * 1000000)) * 100; // Convert to percentage
        this.metricsCollector.updateCpuUsage(Math.min(cpuPercent, 100));

        return metrics;
    }

    /**
     * Get current system health status
     */
    getHealthStatus(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: any;
    } {
        const metrics = this.collectMetrics();
        const memoryUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const issues: string[] = [];

        // Check memory usage
        if (memoryUsagePercent > 90) {
            status = 'unhealthy';
            issues.push('High memory usage');
        } else if (memoryUsagePercent > 80) {
            status = 'degraded';
            issues.push('Elevated memory usage');
        }

        // Check load average (Unix only)
        if (metrics.loadAverage) {
            const loadAvg1min = metrics.loadAverage[0];
            const cpuCount = require('os').cpus().length;
            const loadPercent = (loadAvg1min / cpuCount) * 100;

            if (loadPercent > 90) {
                status = 'unhealthy';
                issues.push('High CPU load');
            } else if (loadPercent > 70) {
                if (status === 'healthy') status = 'degraded';
                issues.push('Elevated CPU load');
            }
        }

        return {
            status,
            details: {
                memory: {
                    usage_percent: memoryUsagePercent,
                    heap_used_mb: Math.round(metrics.memory.heapUsed / 1024 / 1024),
                    heap_total_mb: Math.round(metrics.memory.heapTotal / 1024 / 1024),
                },
                uptime_seconds: metrics.uptime,
                load_average: metrics.loadAverage,
                issues,
            },
        };
    }
}

/**
 * Create and configure a system monitor
 */
export function createSystemMonitor(
    metricsCollector: MetricsCollector,
    logger: Logger,
    autoStart: boolean = true,
    intervalMs: number = 30000
): SystemMonitor {
    const monitor = new SystemMonitor(metricsCollector, logger);

    if (autoStart) {
        monitor.startCollection(intervalMs);
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
        monitor.stopCollection();
    });

    process.on('SIGINT', () => {
        monitor.stopCollection();
    });

    return monitor;
}