import { Request, Response, NextFunction } from 'express';
import { logger } from '@ai-platform/common';

// In-memory metrics storage (in production, use Prometheus or similar)
interface Metrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    byRoute: Record<string, number>;
  };
  responseTime: {
    total: number;
    count: number;
    average: number;
    min: number;
    max: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  activeConnections: number;
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
    byRoute: {},
  },
  responseTime: {
    total: 0,
    count: 0,
    average: 0,
    min: Infinity,
    max: 0,
  },
  errors: {
    total: 0,
    byType: {},
  },
  activeConnections: 0,
};

// Update response time metrics
const updateResponseTimeMetrics = (duration: number) => {
  metrics.responseTime.total += duration;
  metrics.responseTime.count += 1;
  metrics.responseTime.average =
    metrics.responseTime.total / metrics.responseTime.count;
  metrics.responseTime.min = Math.min(metrics.responseTime.min, duration);
  metrics.responseTime.max = Math.max(metrics.responseTime.max, duration);
};

// Update request metrics
const updateRequestMetrics = (
  method: string,
  route: string,
  statusCode: number
) => {
  metrics.requests.total += 1;
  metrics.requests.byMethod[method] =
    (metrics.requests.byMethod[method] || 0) + 1;
  metrics.requests.byStatus[statusCode] =
    (metrics.requests.byStatus[statusCode] || 0) + 1;
  metrics.requests.byRoute[route] = (metrics.requests.byRoute[route] || 0) + 1;
};

// Update error metrics
const updateErrorMetrics = (errorType: string) => {
  metrics.errors.total += 1;
  metrics.errors.byType[errorType] =
    (metrics.errors.byType[errorType] || 0) + 1;
};

// Get route pattern from request
const getRoutePattern = (req: Request): string => {
  // Try to get the route pattern from Express route
  if (req.route && req.route.path) {
    return req.route.path;
  }

  // Fallback to URL pathname with parameter normalization
  const pathname = req.path;

  // Replace UUIDs with :id
  const normalizedPath = pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id'
  );

  // Replace numeric IDs with :id
  return normalizedPath.replace(/\/\d+/g, '/:id');
};

// Main metrics middleware
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Increment active connections
  metrics.activeConnections += 1;

  // Track request start time
  const startTime = Date.now();

  // Handle response completion
  const onResponseFinish = () => {
    const duration = Date.now() - startTime;
    const route = getRoutePattern(req);

    // Update metrics
    updateRequestMetrics(req.method, route, res.statusCode);
    updateResponseTimeMetrics(duration);

    // Decrement active connections
    metrics.activeConnections -= 1;

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
      });
    }

    // Log error responses
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      updateErrorMetrics(errorType);

      logger.warn('Error response', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
      });
    }
  };

  // Listen for response finish
  res.on('finish', onResponseFinish);
  res.on('close', onResponseFinish);

  next();
};

// Metrics endpoint handler
export const getMetrics = (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  const metricsData = {
    timestamp: new Date().toISOString(),
    uptime,
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
    requests: metrics.requests,
    responseTime: {
      ...metrics.responseTime,
      min: metrics.responseTime.min === Infinity ? 0 : metrics.responseTime.min,
    },
    errors: metrics.errors,
    activeConnections: metrics.activeConnections,
  };

  res.json(metricsData);
};

// Health check endpoint handler
export const getHealth = (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(health);
};

// Reset metrics (useful for testing)
export const resetMetrics = () => {
  metrics.requests.total = 0;
  metrics.requests.byMethod = {};
  metrics.requests.byStatus = {};
  metrics.requests.byRoute = {};
  metrics.responseTime.total = 0;
  metrics.responseTime.count = 0;
  metrics.responseTime.average = 0;
  metrics.responseTime.min = Infinity;
  metrics.responseTime.max = 0;
  metrics.errors.total = 0;
  metrics.errors.byType = {};
  metrics.activeConnections = 0;
};

// Export metrics for external access
export { metrics };
