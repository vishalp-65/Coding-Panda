import { Router } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config';
import { HTTP_STATUS, logger } from '@ai-platform/common';
import { ServiceUnavailableError } from '../middleware/error-handler';
import { optionalAuthMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Service configuration with routing rules
const serviceConfig = {
  '/users': {
    target: config.services.userService.url,
    timeout: config.services.userService.timeout,
    auth: 'optional', // Some user endpoints are public
    pathRewrite: { '^/api/users': '/api/v1' },
  },
  '/problems': {
    target: config.services.problemService.url,
    timeout: config.services.problemService.timeout,
    auth: 'optional', // Problem browsing is public, submission requires auth
    pathRewrite: { '^/api/problems': '' },
  },
  '/execute': {
    target: config.services.executionService.url,
    timeout: config.services.executionService.timeout,
    auth: 'required', // Code execution requires authentication
    pathRewrite: { '^/api/execute': '' },
  },
  '/ai': {
    target: config.services.aiService.url,
    timeout: config.services.aiService.timeout,
    auth: 'required', // AI services require authentication
    pathRewrite: { '^/api/ai': '' },
  },
  '/contests': {
    target: config.services.contestService.url,
    timeout: config.services.contestService.timeout,
    auth: 'optional', // Contest viewing is public, participation requires auth
    pathRewrite: { '^/api/v1': '' },
  },
};

// Public routes that bypass authentication entirely
const publicRoutes = [
  '/users/health',
  '/problems/health',
  '/contests/health',
  '/users/api/v1/health',
  '/problems/api/v1/health',
  '/contests/api/v1/health',
];

// Create proxy middleware for each service
Object.entries(serviceConfig).forEach(([path, config]) => {
  const proxyOptions: Options = {
    target: config.target,
    changeOrigin: true,
    pathRewrite: config.pathRewrite,
    timeout: config.timeout,
    secure: false,
    ws: false,
    followRedirects: false,

    // Handle proxy response
    onProxyRes: (proxyRes, req, res) => {
      logger.debug('Proxy response received', {
        requestId: (req as any).requestId || 'unknown',
        statusCode: proxyRes.statusCode,
        target: config.target,
      });
    },

    // Handle proxy errors
    onError: (err, req, res) => {
      logger.error('Proxy error', {
        requestId: (req as any).requestId || 'unknown',
        error: err.message,
        target: config.target,
        method: req.method,
        url: req.url,
      });

      // Prevent the error from crashing the process
      try {
        if (!res.headersSent) {
          res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Service temporarily unavailable',
              service: path.replace('/', ''),
              timestamp: new Date().toISOString(),
              requestId: (req as any).requestId || 'unknown',
            },
          });
        }
      } catch (responseError) {
        logger.error('Error sending proxy error response', {
          error: responseError,
          originalError: err.message,
        });
        // Don't let this crash the process
      }
    },

    // Handle proxy request errors
    onProxyReq: (proxyReq, req, res) => {
      // Forward user information if authenticated
      if ((req as any).user) {
        proxyReq.setHeader('X-User-ID', (req as any).user.id);
        proxyReq.setHeader('X-User-Email', (req as any).user.email);
        proxyReq.setHeader(
          'X-User-Roles',
          JSON.stringify((req as any).user.roles)
        );
      }

      // Forward request ID for tracing
      const requestId = (req as any).requestId || 'unknown';
      proxyReq.setHeader('X-Request-ID', requestId);

      // Forward real IP
      const realIP = req.ip || req.connection.remoteAddress;
      if (realIP) {
        proxyReq.setHeader('X-Real-IP', realIP);
      }

      // Forward req body to the services
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }

      // Handle proxy request errors
      proxyReq.on('error', err => {
        logger.error('Proxy request error', {
          error: err.message,
          target: config.target,
          method: req.method,
          url: req.url,
        });
      });

      logger.debug('Proxying request', {
        requestId: (req as any).requestId || 'unknown',
        method: req.method,
        originalUrl: req.originalUrl,
        target: config.target,
        userId: (req as any).user?.id,
      });
    },
  };

  // Apply authentication middleware based on service configuration
  if (config.auth === 'required') {
    router.use(path, (req, res, next) => {
      if (!(req as any).user) {
        return res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required for this service',
          },
        });
      }
      next();
    });
  } else if (config.auth === 'optional') {
    // Skip auth middleware for public health check routes
    router.use(path, (req, res, next) => {
      const isPublicRoute = req.path.includes('health');

      logger.debug('Route processing', {
        requestId: (req as any).requestId || 'unknown',
        path: req.path,
        originalUrl: req.originalUrl,
        servicePath: path,
        isPublicRoute,
        method: req.method,
      });

      if (isPublicRoute) {
        logger.debug('Skipping auth for health check route');
        return next();
      }
      return optionalAuthMiddleware(req, res, next);
    });
  }

  // Create and apply proxy middleware
  const proxy = createProxyMiddleware(proxyOptions);
  router.use(path, proxy);
});

// Admin routes with role-based access
router.use('/admin', requireRole('admin'));

// Moderator routes
router.use('/moderate', requireRole(['admin', 'moderator']));

export { router as serviceRoutes };
