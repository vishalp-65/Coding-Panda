import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@ai-platform/common';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

export const rateLimitMiddleware = (maxRequests: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${req.ip}:${req.route?.path || req.path}`;
        const now = Date.now();

        // Clean up expired entries
        if (store[key] && now > store[key].resetTime) {
            delete store[key];
        }

        // Initialize or increment counter
        if (!store[key]) {
            store[key] = {
                count: 1,
                resetTime: now + windowMs,
            };
        } else {
            store[key].count++;
        }

        // Check if limit exceeded
        if (store[key].count > maxRequests) {
            const resetTime = Math.ceil((store[key].resetTime - now) / 1000);

            res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Too many requests. Try again in ${resetTime} seconds.`,
                    timestamp: new Date().toISOString(),
                    retryAfter: resetTime,
                },
            });
            return;
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(store[key].resetTime / 1000));

        next();
    };
};