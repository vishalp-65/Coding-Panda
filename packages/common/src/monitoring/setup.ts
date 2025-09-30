import { MetricsCollector } from './metrics';
import { Logger, LoggingConfig, setupProcessErrorHandlers } from './logging';
import { TracingManager, TracingConfig } from './tracing';
import { HealthManager } from './health';

export interface MonitoringSetupConfig {
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    logging?: Partial<LoggingConfig>;
    tracing?: Partial<TracingConfig>;
    enableTracing?: boolean;
    enableMetrics?: boolean;
    enableHealthChecks?: boolean;
}

export interface MonitoringComponents {
    metricsCollector: MetricsCollector;
    logger: Logger;
    tracingManager?: TracingManager;
    healthManager: HealthManager;
}

/**
 * Sets up comprehensive monitoring for a service
 */
export function setupMonitoring(config: MonitoringSetupConfig): MonitoringComponents {
    const {
        serviceName,
        serviceVersion = '1.0.0',
        environment = process.env.NODE_ENV || 'development',
        enableTracing = true,
        enableMetrics = true,
        enableHealthChecks = true,
    } = config;

    // Initialize logger
    const logger = new Logger({
        serviceName,
        environment,
        level: environment === 'production' ? 'info' : 'debug',
        logToFile: environment === 'production',
        logFilePath: `/var/log/app/${serviceName}.log`,
        ...config.logging,
    });

    // Setup process error handlers
    setupProcessErrorHandlers(logger);

    // Initialize metrics collector
    const metricsCollector = enableMetrics ? new MetricsCollector(serviceName) : null;

    // Initialize tracing manager
    let tracingManager: TracingManager | undefined;
    if (enableTracing) {
        tracingManager = new TracingManager({
            serviceName,
            serviceVersion,
            environment,
            jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
            ...config.tracing,
        });

        try {
            tracingManager.initialize();
            logger.info('Tracing initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize tracing', error as Error);
        }
    }

    // Initialize health manager
    const healthManager = enableHealthChecks ? new HealthManager(serviceName, serviceVersion) : null;

    logger.info('Monitoring setup completed', {
        serviceName,
        serviceVersion,
        environment,
        enableTracing,
        enableMetrics,
        enableHealthChecks,
    });

    return {
        metricsCollector: metricsCollector!,
        logger,
        tracingManager,
        healthManager: healthManager!,
    };
}

/**
 * Gracefully shutdown monitoring components
 */
export async function shutdownMonitoring(components: MonitoringComponents): Promise<void> {
    const { logger, tracingManager } = components;

    logger.info('Shutting down monitoring components');

    if (tracingManager) {
        try {
            await tracingManager.shutdown();
            logger.info('Tracing shutdown completed');
        } catch (error) {
            logger.error('Error shutting down tracing', error as Error);
        }
    }

    logger.info('Monitoring shutdown completed');
}