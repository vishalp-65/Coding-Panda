import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { apiRoutes } from './routes';
import { config } from './config/env';

export const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors(config.cors));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);

  // API routes
  app.use('/api/v1', apiRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'AI Platform User Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Global error handler
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error('Unhandled error:', err);

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            config.nodeEnv === 'production'
              ? 'Internal server error'
              : err.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  return app;
};
