import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ContestController } from './controllers/contest.controller';
import { ContestService } from './services/contest.service';
import { ContestRepository } from './repositories/contest.repository';
import { NotificationService } from './services/notification.service';
import { CodeExecutionService } from './services/code-execution.service';
import { SchedulerService } from './services/scheduler.service';
import { createContestRoutes } from './routes/contest.routes';
import { db } from './config/database';
import { logger } from './utils/logger';

export const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
      ],
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    const requestId =
      req.headers['x-request-id'] ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;

    logger.info(`${req.method} ${req.path}`, {
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    next();
  });

  // Initialize services
  const contestRepository = new ContestRepository(db);
  const notificationService = new NotificationService();
  const codeExecutionService = new CodeExecutionService();
  const contestService = new ContestService(
    contestRepository,
    notificationService,
    codeExecutionService
  );
  const contestController = new ContestController(contestService);

  // Initialize scheduler
  const schedulerService = new SchedulerService(
    contestService,
    contestRepository,
    notificationService
  );
  schedulerService.start();

  // Routes
  app.use('/api/v1', createContestRoutes(contestController));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'contest-service',
      version: '1.0.0',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      },
    });
  });

  // Global error handler
  app.use(
    (
      error: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.error('Unhandled error:', error);

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
        },
      });
    }
  );

  return app;
};
