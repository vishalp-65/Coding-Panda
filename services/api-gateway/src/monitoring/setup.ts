import {
  MetricsCollector,
  Logger,
  TracingManager,
  HealthManager,
  DatabaseHealthCheck,
  RedisHealthCheck,
  ExternalServiceHealthCheck,
  MemoryHealthCheck,
} from '@ai-platform/common';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MonitoringSetup {
  metricsCollector: MetricsCollector;
  logger: Logger;
  tracingManager: TracingManager;
  healthManager: HealthManager;
}

export interface MonitoringConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  logLevel: string;
  logToFile: boolean;
  logFilePath: string;
  jaegerEndpoint: string;
  redisUrl?: string;
}

interface ExternalService {
  name: string;
  url: string;
  timeout?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  serviceName: 'api-gateway',
  serviceVersion: '1.0.0',
  environment: 'development',
  logLevel: 'info',
  jaegerEndpoint: 'http://localhost:14268/api/traces',
  memoryThreshold: 85,
  healthCheckTimeout: 5000,
  gracefulShutdownDelay: 1000,
};

const EXTERNAL_SERVICES: ExternalService[] = [
  { name: 'user-service', url: 'http://localhost:3006/api/v1/health' },
  { name: 'problem-service', url: 'http://localhost:3002/api/v1/health' },
  { name: 'notification-service', url: 'http://localhost:3005/api/v1/health' },
  {
    name: 'code-execution-service',
    url: 'http://localhost:3004/api/v1/health',
  },
  { name: 'ai-analysis-service', url: 'http://localhost:8001/api/v1/metrics' },
  { name: 'realtime-service', url: 'http://localhost:3007/api/v1/health' },
  { name: 'contest-service', url: 'http://localhost:3003/api/v1/health' },
  { name: 'analytics-service', url: 'http://localhost:3008/api/v1/health' },
];

// ============================================================================
// Configuration Builder
// ============================================================================

function buildMonitoringConfig(): MonitoringConfig {
  const environment = process.env.NODE_ENV || DEFAULT_CONFIG.environment;
  const serviceName = DEFAULT_CONFIG.serviceName;

  return {
    serviceName,
    serviceVersion:
      process.env.SERVICE_VERSION || DEFAULT_CONFIG.serviceVersion,
    environment,
    logLevel: process.env.LOG_LEVEL || DEFAULT_CONFIG.logLevel,
    logToFile: environment === 'production',
    logFilePath: `/var/log/app/${serviceName}.log`,
    jaegerEndpoint:
      process.env.JAEGER_ENDPOINT || DEFAULT_CONFIG.jaegerEndpoint,
    redisUrl: process.env.REDIS_URL,
  };
}

// ============================================================================
// Component Initialization
// ============================================================================

class MonitoringInitializer {
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  initializeMetrics(): MetricsCollector {
    return new MetricsCollector(this.config.serviceName);
  }

  initializeLogger(): Logger {
    return new Logger({
      serviceName: this.config.serviceName,
      level: this.config.logLevel,
      environment: this.config.environment,
      logToFile: this.config.logToFile,
      logFilePath: this.config.logFilePath,
    });
  }

  initializeTracing(): TracingManager {
    const tracingManager = new TracingManager({
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      environment: this.config.environment,
      jaegerEndpoint: this.config.jaegerEndpoint,
    });

    tracingManager.initialize();
    return tracingManager;
  }

  initializeHealth(): HealthManager {
    return new HealthManager(
      this.config.serviceName,
      this.config.serviceVersion
    );
  }
}

// ============================================================================
// Health Check Registration
// ============================================================================

class HealthCheckRegistry {
  constructor(
    private healthManager: HealthManager,
    private logger: Logger,
    private config: MonitoringConfig
  ) {}

  registerAll(): void {
    this.registerMemoryCheck();
    this.registerRedisCheck();
    this.registerExternalServiceChecks();
  }

  private registerMemoryCheck(): void {
    this.healthManager.registerCheck(
      new MemoryHealthCheck(DEFAULT_CONFIG.memoryThreshold)
    );
  }

  private registerRedisCheck(): void {
    if (!this.config.redisUrl) {
      return;
    }

    try {
      const redis = require('redis');
      const redisClient = redis.createClient({ url: this.config.redisUrl });
      this.healthManager.registerCheck(new RedisHealthCheck(redisClient));

      this.logger.info('Redis health check registered', {
        redisUrl: this.maskSensitiveUrl(this.config.redisUrl),
      });
    } catch (error) {
      this.logger.warn('Failed to register Redis health check', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private registerExternalServiceChecks(): void {
    EXTERNAL_SERVICES.forEach(service => {
      this.healthManager.registerCheck(
        new ExternalServiceHealthCheck(
          service.name,
          service.url,
          service.timeout || DEFAULT_CONFIG.healthCheckTimeout
        )
      );
    });

    this.logger.info('External service health checks registered', {
      count: EXTERNAL_SERVICES.length,
      services: EXTERNAL_SERVICES.map(s => s.name),
    });
  }

  private maskSensitiveUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.password) {
        urlObj.password = '***';
      }
      return urlObj.toString();
    } catch {
      return 'invalid-url';
    }
  }
}

// ============================================================================
// Process Signal Handlers
// ============================================================================

class ProcessSignalHandler {
  constructor(
    private logger: Logger,
    private tracingManager: TracingManager
  ) {}

  setupHandlers(): void {
    this.handleUncaughtException();
    this.handleUnhandledRejection();
    this.handleShutdownSignals();
  }

  private handleUncaughtException(): void {
    process.on('uncaughtException', async (error: Error) => {
      this.logger.error('Uncaught Exception', error, { severity: 'critical' });
      this.tracingManager.recordException(error);

      // Allow time for logs to flush before exiting
      setTimeout(() => {
        process.exit(1);
      }, DEFAULT_CONFIG.gracefulShutdownDelay);
    });
  }

  private handleUnhandledRejection(): void {
    process.on(
      'unhandledRejection',
      (reason: unknown, promise: Promise<unknown>) => {
        const error = new Error(
          `Unhandled Rejection: ${reason instanceof Error ? reason.message : String(reason)}`
        );

        this.logger.error('Unhandled Rejection', error, {
          severity: 'critical',
          reason: String(reason),
          promise: promise.toString(),
        });

        this.tracingManager.recordException(error);
      }
    );
  }

  private handleShutdownSignals(): void {
    const shutdownHandler = async (signal: string) => {
      this.logger.info(`${signal} received, shutting down gracefully`);

      try {
        await this.tracingManager.shutdown();
        this.logger.info('Tracing manager shut down successfully');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
  }
}

// ============================================================================
// Main Setup Function
// ============================================================================

export function setupMonitoring(): MonitoringSetup {
  const config = buildMonitoringConfig();
  const initializer = new MonitoringInitializer(config);

  // Initialize core components
  const metricsCollector = initializer.initializeMetrics();
  const logger = initializer.initializeLogger();
  const tracingManager = initializer.initializeTracing();
  const healthManager = initializer.initializeHealth();

  // Register health checks
  const healthRegistry = new HealthCheckRegistry(healthManager, logger, config);
  healthRegistry.registerAll();

  // Setup process handlers
  const signalHandler = new ProcessSignalHandler(logger, tracingManager);
  signalHandler.setupHandlers();

  logger.info('Monitoring infrastructure initialized successfully', {
    service: config.serviceName,
    version: config.serviceVersion,
    environment: config.environment,
    healthChecksRegistered: EXTERNAL_SERVICES.length + 2, // memory + redis + external services
  });

  return {
    metricsCollector,
    logger,
    tracingManager,
    healthManager,
  };
}

// ============================================================================
// Exported for Testing
// ============================================================================

export const __testing__ = {
  buildMonitoringConfig,
  MonitoringInitializer,
  HealthCheckRegistry,
  ProcessSignalHandler,
  EXTERNAL_SERVICES,
  DEFAULT_CONFIG,
};
