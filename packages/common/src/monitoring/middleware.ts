import { Request, Response, NextFunction } from 'express';
import { MetricsCollector } from './metrics';
import { Logger } from './logging';
import { TracingManager } from './tracing';
import { metricsRegistry } from './metrics';

export interface MonitoringMiddlewareConfig {
  serviceName: string;
  metricsCollector: MetricsCollector;
  logger: Logger;
  tracingManager?: TracingManager;
}

// Metrics middleware
export function metricsMiddleware(config: MonitoringMiddlewareConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const route = req.route?.path || req.path;

      config.metricsCollector.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration
      );
    });

    next();
  };
}

// Prometheus metrics endpoint
export function metricsEndpoint() {
  return async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', metricsRegistry.contentType);
      const metrics = await metricsRegistry.metrics();
      res.end(metrics);
      return metrics;
    } catch (error) {
      res.status(500).end('Error collecting metrics');
    }
  };
}

// Error tracking middleware
export function errorTrackingMiddleware(config: MonitoringMiddlewareConfig) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    config.logger.logApplicationError('Request error', error, {
      method: req.method,
      url: req.url,
      correlation_id: (req as any).correlationId,
      user_id: (req as any).user?.id,
    });

    // Record error in tracing
    if (config.tracingManager) {
      config.tracingManager.recordException(error);
    }

    // Update error metrics
    const route = req.route?.path || req.path;
    config.metricsCollector.recordHttpRequest(req.method, route, 500, 0);

    next(error);
  };
}

// Performance monitoring middleware
export function performanceMiddleware(config: MonitoringMiddlewareConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds

      // Log slow requests
      if (duration > 1000) {
        // Log requests slower than 1 second
        config.logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration,
          status: res.statusCode,
          correlation_id: (req as any).correlationId,
        });
      }

      // Record performance metrics
      config.logger.logPerformanceMetric('request_duration', duration, 'ms');
    });

    next();
  };
}

// Security monitoring middleware
export function securityMonitoringMiddleware(
  config: MonitoringMiddlewareConfig
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Monitor for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /\.\.\//g, type: 'path_traversal' },
      { pattern: /<script/gi, type: 'xss_attempt' },
      { pattern: /union.*select/gi, type: 'sql_injection' },
      { pattern: /javascript:/gi, type: 'javascript_injection' },
      { pattern: /eval\(/gi, type: 'code_injection' },
      { pattern: /exec\(/gi, type: 'command_injection' },
    ];

    const url = req.url;
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    const headers = JSON.stringify(req.headers || {});

    for (const { pattern, type } of suspiciousPatterns) {
      if (
        pattern.test(url) ||
        pattern.test(body) ||
        pattern.test(query) ||
        pattern.test(headers)
      ) {
        config.logger.logSecurityEvent('Suspicious request pattern detected', {
          pattern_type: type,
          method: req.method,
          url: req.url,
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          correlation_id: (req as any).correlationId,
        });

        config.metricsCollector.recordSecurityEvent(type, 'warning');
        break;
      }
    }

    // Monitor for suspicious user agents
    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.length < 10) {
      config.logger.logSecurityEvent('Request with suspicious user agent', {
        user_agent: userAgent,
        ip: req.ip,
        url: req.url,
        correlation_id: (req as any).correlationId,
      });

      config.metricsCollector.recordSecurityEvent(
        'suspicious_user_agent',
        'info'
      );
    }

    // Monitor for excessive request sizes
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) {
      // 10MB
      config.logger.logSecurityEvent('Large request detected', {
        content_length: contentLength,
        url: req.url,
        ip: req.ip,
        correlation_id: (req as any).correlationId,
      });

      config.metricsCollector.recordSecurityEvent('large_request', 'warning');
    }

    next();
  };
}

// Business metrics middleware
export function businessMetricsMiddleware(config: MonitoringMiddlewareConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      // Track successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const route = req.route?.path || req.path;

        // Track specific business events
        if (route && route.includes('/problems') && req.method === 'POST') {
          config.logger.logBusinessEvent('problem_created', {
            user_id: (req as any).user?.id,
            correlation_id: (req as any).correlationId,
          });
        }

        if (route && route.includes('/submissions') && req.method === 'POST') {
          config.logger.logBusinessEvent('solution_submitted', {
            user_id: (req as any).user?.id,
            problem_id: req.body?.problemId,
            language: req.body?.language,
            correlation_id: (req as any).correlationId,
          });
        }

        if (route && route.includes('/contests') && req.method === 'POST') {
          config.logger.logBusinessEvent('contest_created', {
            user_id: (req as any).user?.id,
            correlation_id: (req as any).correlationId,
          });
        }
      }
    });

    next();
  };
}

// Database monitoring wrapper
export function monitorDatabaseQuery<T>(
  config: MonitoringMiddlewareConfig,
  operation: string,
  table: string,
  query: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();

    try {
      const result = await query();
      const duration = (Date.now() - start) / 1000;

      config.metricsCollector.recordDatabaseQuery(operation, table, duration);
      config.logger.logDatabaseQuery(operation, table, duration);

      resolve(result);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;

      config.logger.error(
        `Database query failed: ${operation} on ${table}`,
        error as Error,
        {
          operation,
          table,
          duration,
        }
      );

      reject(error);
    }
  });
}

// Queue monitoring wrapper
export function monitorQueueProcessing<T>(
  config: MonitoringMiddlewareConfig,
  queueName: string,
  processor: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();

    try {
      const result = await processor();
      const duration = (Date.now() - start) / 1000;

      config.metricsCollector.recordQueueProcessing(queueName, duration);
      config.logger.info('Queue item processed', {
        queue: queueName,
        duration,
        status: 'success',
      });

      resolve(result);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;

      config.logger.error(
        `Queue processing failed: ${queueName}`,
        error as Error,
        {
          queue: queueName,
          duration,
          status: 'failed',
        }
      );

      reject(error);
    }
  });
}

// Combined monitoring middleware
export function createMonitoringMiddleware(config: MonitoringMiddlewareConfig) {
  return [
    metricsMiddleware(config),
    performanceMiddleware(config),
    securityMonitoringMiddleware(config),
    businessMetricsMiddleware(config),
  ];
}
