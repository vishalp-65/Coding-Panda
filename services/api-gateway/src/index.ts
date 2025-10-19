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
// TODO: Import gRPC clients once protobuf files are generated
// import { initializeGrpcClients, cleanupGrpcClients } from './grpc/clients';

async function startServer() {
  try {
    const app = express();
    const server = createServer(app);

    // TODO: Initialize gRPC clients once protobuf files are generated
    // initializeGrpcClients();
    // logger.info('gRPC clients initialized');

    // Initialize monitoring
    const monitoring = setupMonitoring();

    // Setup basic middleware first (including logging that sets requestId)
    await setupMiddleware(app);

    // Setup monitoring middleware after requestId is set
    app.use(
      createMonitoringMiddleware({
        serviceName: 'api-gateway',
        metricsCollector: monitoring.metricsCollector,
        logger: monitoring.logger,
        tracingManager: monitoring.tracingManager,
      })
    );

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
