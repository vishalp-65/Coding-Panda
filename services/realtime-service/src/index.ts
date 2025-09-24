import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { RedisManager } from './config/redis';
import { authenticateSocket } from './middleware/auth';
import { SocketHandlers } from './handlers/SocketHandlers';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST'],
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'realtime-service',
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO server setup
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Authentication middleware for Socket.IO
io.use(authenticateSocket);

async function startServer() {
  try {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisManager = RedisManager.getInstance();
    await redisManager.initialize(redisUrl);

    // Set up Redis adapter for Socket.IO clustering
    io.adapter(redisManager.getAdapter());

    // Set up socket event handlers
    const socketHandlers = new SocketHandlers(io);
    socketHandlers.setupHandlers();

    // Start server
    const port = process.env.PORT || 3007;
    server.listen(port, () => {
      console.log(`Real-time service running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');

      // Close Socket.IO server
      io.close(() => {
        console.log('Socket.IO server closed');
      });

      // Close Redis connections
      await redisManager.disconnect();

      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');

      io.close(() => {
        console.log('Socket.IO server closed');
      });

      await redisManager.disconnect();

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export { io, app };
