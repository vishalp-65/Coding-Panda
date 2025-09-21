import express, { Express } from 'express';
import { corsMiddleware } from './cors';
import { securityMiddleware, additionalSecurityMiddleware } from './security';
import { loggingMiddleware } from './logging';
import { rateLimitMiddleware } from './rate-limit';
import { authMiddleware } from './auth';
import { metricsMiddleware } from './metrics';
import { errorHandlerMiddleware } from './error-handler';
import { logger } from '@ai-platform/common';

export async function setupMiddleware(
  app: Express | express.Application
): Promise<void> {
  try {
    // Security headers (should be first)
    app.use(securityMiddleware);
    app.use(additionalSecurityMiddleware);

    // CORS
    app.use(corsMiddleware);

    // Request parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    app.use(loggingMiddleware);

    // Metrics collection
    app.use(metricsMiddleware);

    // Rate limiting
    app.use(rateLimitMiddleware);

    // Authentication middleware is applied selectively in routes, not globally

    // Error handling (should be last)
    app.use(errorHandlerMiddleware);

    logger.info('Middleware setup completed');
  } catch (error) {
    logger.error('Failed to setup middleware', { error });
    throw error;
  }
}

export * from './cors';
export * from './security';
export * from './logging';
export * from './rate-limit';
export * from './auth';
export * from './metrics';
export * from './error-handler';
