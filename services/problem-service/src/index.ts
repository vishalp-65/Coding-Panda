import express from 'express';
import { connectToDatabase } from './config/database';
import { problemRoutes } from './routes/problemRoutes';
import { errorHandler } from '@ai-platform/common';
import { logger } from '@ai-platform/common';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', problemRoutes);

// Error handling
app.use(errorHandler);

async function startServer() {
  try {
    await connectToDatabase();
    logger.info('Connected to MongoDB');

    // Start HTTP server
    const httpServer = app.listen(PORT, () => {
      logger.info(`Problem Service HTTP server running on port ${PORT}`);
    });

    // TODO: Add gRPC server once protobuf files are generated
    // const grpcService = new ProblemGrpcService();
    // await grpcService.start();

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // TODO: Stop gRPC server when implemented
        // await grpcService.stop();
        // logger.info('gRPC server stopped');

        // Stop HTTP server
        httpServer.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
