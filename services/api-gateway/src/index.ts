import express from 'express';
import { createServer } from 'http';
import { config } from './config';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { logger } from '@ai-platform/common';
import { gracefulShutdown } from './utils/graceful-shutdown';

async function startServer() {
  try {
    const app = express();
    const server = createServer(app);

    // Setup middleware
    await setupMiddleware(app);

    // Setup routes
    setupRoutes(app);

    // Start server
    server.listen(config.port, () => {
      logger.info(`API Gateway started on port ${config.port}`, {
        service: 'api-gateway',
        port: config.port,
        environment: config.nodeEnv,
      });
    });

    // Setup graceful shutdown
    gracefulShutdown(server);
  } catch (error) {
    logger.error('Failed to start API Gateway', { error });
    process.exit(1);
  }
}

startServer();
