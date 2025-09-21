import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '@ai-platform/common';

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

  logger.warn('Rate limit exceeded', {
    requestId: req.requestId,
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

// Export Redis client for cleanup
export { redisClient };
