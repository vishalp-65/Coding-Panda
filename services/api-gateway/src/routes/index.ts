import express, { Express } from 'express';
import { getHealth, getMetrics } from '../middleware/metrics';
import { notFoundHandler } from '../middleware/error-handler';
import { serviceRoutes } from './services';
// TODO: Import gRPC routes once protobuf files are generated
// import { grpcRoutes } from './grpc-routes';
import { authRateLimitMiddleware } from '../middleware/rate-limit';

export function setupRoutes(app: Express): void {
  // Health check endpoint (no authentication required)
  app.get('/api/v1/health', (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'API Gateway',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  // Metrics endpoint (no authentication required)
  app.get('/metrics', getMetrics);

  // Simple test endpoint (no authentication required)
  app.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'API Gateway is working',
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId || 'unknown',
    });
  });

  // TODO: Add gRPC-based API routes once protobuf files are generated
  // app.use('/api/v2', grpcRoutes);

  // HTTP proxy routes
  app.use('/api', serviceRoutes);

  // Authentication routes with stricter rate limiting
  app.use('/auth', authRateLimitMiddleware);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);
}
