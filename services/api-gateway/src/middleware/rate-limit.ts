import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger, SecurityAuditLogger, createRateLimit } from '@ai-platform/common';

// Create Redis client for rate limiting
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redisClient.on('error', error => {
  logger.error('Redis rate limit store error', { error });
});

redisClient.on('connect', () => {
  logger.info('Redis rate limit store connected');
});

// Custom key generator that includes user ID if available
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Use user ID if authenticated, otherwise use IP
  return userId ? `user:${userId}` : `ip:${ip}`;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.connection.remoteAddress;

  // Log security event for rate limit violation
  SecurityAuditLogger.logSecurityEvent(
    'RATE_LIMIT_EXCEEDED',
    'MEDIUM',
    {
      userId,
      ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
    }
  );

  logger.warn('Rate limit exceeded', {
    requestId: req.requestId || 'unknown',
    userId,
    ip,
    method: req.method,
    url: req.url,
  });

  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      timestamp: new Date().toISOString(),
    },
  });
};

// Skip rate limiting for certain conditions
const skipRateLimit = (req: Request): boolean => {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/metrics') {
    return true;
  }

  // Skip for successful requests if configured
  if (config.rateLimit.skipSuccessfulRequests) {
    return false; // Let the rate limiter handle this
  }

  return false;
};

// Main rate limiting middleware
export const rateLimitMiddleware = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: any[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  keyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});

// Stricter rate limiting for authentication endpoints
export const authRateLimitMiddleware = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: any[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `auth:${ip}`;
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

// Strict rate limiting for admin endpoints
export const adminRateLimitMiddleware = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: any[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Very strict limit for admin operations
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `admin:${userId}:${ip}`;
  },
  handler: (req: Request, res: Response) => {
    SecurityAuditLogger.logSecurityEvent(
      'ADMIN_RATE_LIMIT_EXCEEDED',
      'HIGH',
      {
        userId: (req as any).user?.id,
        ip: req.ip,
        method: req.method,
        url: req.url,
      }
    );

    res.status(429).json({
      error: {
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        message: 'Too many admin requests, please try again later',
        timestamp: new Date().toISOString(),
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for file upload endpoints
export const uploadRateLimitMiddleware = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: any[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `upload:${userId}`;
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for search endpoints
export const searchRateLimitMiddleware = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: any[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || req.ip || 'unknown';
    return `search:${userId}`;
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Progressive rate limiting based on user behavior
export const adaptiveRateLimitMiddleware = (req: Request, res: Response, next: any) => {
  const userId = (req as any).user?.id;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Check for suspicious patterns
  const suspiciousPatterns = [
    req.path.includes('..'),
    req.path.includes('<script>'),
    req.path.includes('DROP TABLE'),
    req.headers['user-agent']?.includes('bot'),
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern);

  if (isSuspicious) {
    SecurityAuditLogger.logSuspiciousActivity(req, 'SUSPICIOUS_REQUEST_PATTERN', {
      patterns: suspiciousPatterns,
      userId,
      ip,
    });

    // Apply stricter rate limiting for suspicious requests
    const strictLimit = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 1, // Only 1 request per minute for suspicious activity
      keyGenerator: () => `suspicious:${ip}`,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: {
            code: 'SUSPICIOUS_ACTIVITY_RATE_LIMIT',
            message: 'Request blocked due to suspicious activity',
            timestamp: new Date().toISOString(),
          },
        });
      },
    });

    return strictLimit(req, res, next);
  }

  next();
};

// Export Redis client for cleanup
export { redisClient };
