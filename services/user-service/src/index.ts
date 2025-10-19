import 'reflect-metadata';
import { createApp } from './app';
import { initializeDatabase } from './config/database';
import { config } from './config/env';

const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const httpServer = app.listen(config.port, () => {
      console.log(`User Service HTTP server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(
        `Health check: http://localhost:${config.port}/api/v1/health`
      );
    });

    // TODO: Add gRPC server once protobuf files are generated
    // const grpcService = new UserGrpcService();
    // await grpcService.start();

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // TODO: Stop gRPC server when implemented
        // await grpcService.stop();
        // console.log('gRPC server stopped');

        // Stop HTTP server
        httpServer.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.error(
            'Could not close connections in time, forcefully shutting down'
          );
          process.exit(1);
        }, 10000);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
