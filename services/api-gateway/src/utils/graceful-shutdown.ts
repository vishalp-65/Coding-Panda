import { Server } from 'http';
import { logger, TracingManager } from '@ai-platform/common';
import { redisClient } from '../middleware/rate-limit';

export function gracefulShutdown(server: Server, tracingManager?: TracingManager): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    server.close(async err => {
      if (err) {
        logger.error('Error during server shutdown', { error: err });
        process.exit(1);
      }

      try {
        // Close Redis connection
        await redisClient.quit();
        logger.info('Redis connection closed');

        // Shutdown tracing
        if (tracingManager) {
          await tracingManager.shutdown();
          logger.info('Tracing shutdown completed');
        }

        // Add other cleanup tasks here
        // - Close database connections
        // - Finish processing ongoing requests
        // - Clean up temporary files

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup', { error });
        process.exit(1);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000); // 10 seconds timeout
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('Uncaught exception', { error });
    logger.info('Received uncaughtException, starting graceful shutdown');
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    logger.info('Received unhandledRejection, starting graceful shutdown');
    // Don't shutdown for promise rejections, just log them
    // shutdown('unhandledRejection');
  });
}
