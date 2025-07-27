import express, { Express, Router } from 'express';
import { getHealth, getMetrics } from '../middleware/metrics';
import { notFoundHandler } from '../middleware/error-handler';
import { serviceRoutes } from './services';
import { authRateLimitMiddleware } from '../middleware/rate-limit';

export function setupRoutes(app: Express | express.Application): void {
  // Health check endpoint (no authentication required)
  app.get('/health', getHealth);

  // Metrics endpoint (no authentication required)
  app.get('/metrics', getMetrics);

  // API routes with service discovery
  app.use('/api', serviceRoutes);

  // Authentication routes with stricter rate limiting
  app.use('/auth', authRateLimitMiddleware);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);
}
