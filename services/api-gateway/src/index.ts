import express from 'express';
import { createServer } from 'http';
import { config } from './config';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { logger } from '@ai-platform/common';
import { gracefulShutdown } from './utils/graceful-shutdown';
import { setupMonitoring } from './monitoring/setup';
import { createMonitoringRoutes } from './routes/monitoring';
import { createMonitoringMiddleware } from '@ai-platform/common';

async function startServer() {
  try {
    const app = express();
    const server = createServer(app);

    // Initialize monitoring
    const monitoring = setupMonitoring();

    // Setup monitoring middleware (should be early in the chain)
    app.use(createMonitoringMiddleware({
      serviceName: 'api-gateway',
      metricsCollector: monitoring.metricsCollector,
      logger: monitoring.logger,
      tracingManager: monitoring.tracingManager,
    }));

    // Setup middleware
    await setupMiddleware(app);

    // Setup monitoring routes
    app.use(createMonitoringRoutes(monitoring.healthManager));

    // Setup routes
    setupRoutes(app);

    // Start server
    server.listen(config.port, () => {
      monitoring.logger.info(`API Gateway started on port ${config.port}`, {
        service: 'api-gateway',
        port: config.port,
        environment: config.nodeEnv,
      });
    });

    // Setup graceful shutdown
    gracefulShutdown(server, monitoring.tracingManager);
  } catch (error) {
    logger.error('Failed to start API Gateway', { error });
    process.exit(1);
  }
}

startServer();
