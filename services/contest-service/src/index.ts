import dotenv from 'dotenv';
import { createApp } from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { logger } from '@ai-platform/common';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3003;
const SERVICE_NAME = 'Contest Service';

async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Create and start the Express app
    const app = createApp();

    const server = app.listen(PORT, () => {
      logger.info(`${SERVICE_NAME} started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        service: SERVICE_NAME
      });
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

function setupGracefulShutdown(server: any): void {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await closeDatabase();
        logger.info('Database connections closed');
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
    process.exit(1);
  });
}

// Start the server
startServer();
