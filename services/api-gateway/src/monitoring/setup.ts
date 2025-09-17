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

export interface MonitoringSetup {
  metricsCollector: MetricsCollector;
  logger: Logger;
  tracingManager: TracingManager;
  healthManager: HealthManager;
}

export function setupMonitoring(): MonitoringSetup {
  const serviceName = 'api-gateway';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  // Initialize metrics collector
  const metricsCollector = new MetricsCollector(serviceName);

  // Initialize logger
  const logger = new Logger({
    serviceName,
    level: process.env.LOG_LEVEL || 'info',
    environment,
    logToFile: environment === 'production',
    logFilePath: `/var/log/app/${serviceName}.log`,
  });

  // Initialize tracing
  const tracingManager = new TracingManager({
    serviceName,
    serviceVersion,
    environment,
    jaegerEndpoint:
      process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  // Initialize tracing
  tracingManager.initialize();

  // Initialize health manager
  const healthManager = new HealthManager(serviceName, serviceVersion);

  // Register health checks
  setupHealthChecks(healthManager, logger);

  // Setup process error handlers
  setupProcessHandlers(logger, tracingManager);

  logger.info('Monitoring infrastructure initialized', {
    service: serviceName,
    version: serviceVersion,
    environment,
  });

  return {
    metricsCollector,
    logger,
    tracingManager,
    healthManager,
  };
}

function setupHealthChecks(healthManager: HealthManager, logger: Logger) {
  // Memory health check
  healthManager.registerCheck(new MemoryHealthCheck(85));

  // Redis health check (if Redis is used)
  if (process.env.REDIS_URL) {
    try {
      const redis = require('redis');
      const redisClient = redis.createClient({ url: process.env.REDIS_URL });
      healthManager.registerCheck(new RedisHealthCheck(redisClient));
    } catch (error) {
      logger.warn('Redis health check not registered', {
        error: (error as Error).message,
      });
    }
  }

  // External service health checks
  const externalServices = [
    { name: 'user-service', url: 'http://localhost:3001/api/v1/health' },
    // Just checking auth functionality now
    // { name: 'problem-service', url: 'http://localhost:3002/health' },
    // { name: 'code-execution-service', url: 'http://localhost:8000/health' },
  ];

  externalServices.forEach(service => {
    healthManager.registerCheck(
      new ExternalServiceHealthCheck(service.name, service.url, 5000)
    );
  });
}

function setupProcessHandlers(logger: Logger, tracingManager: TracingManager) {
  process.on('uncaughtException', async error => {
    logger.error('Uncaught Exception', error, { severity: 'critical' });
    tracingManager.recordException(error);

    // Graceful shutdown
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    const error = new Error(`Unhandled Rejection: ${reason}`);
    logger.error('Unhandled Rejection', error, {
      severity: 'critical',
      promise: promise.toString(),
    });
    tracingManager.recordException(error);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await tracingManager.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await tracingManager.shutdown();
    process.exit(0);
  });
}
