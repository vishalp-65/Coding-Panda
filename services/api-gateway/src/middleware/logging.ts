import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@ai-platform/common';

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate unique request ID
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
    },
  });

  // Capture response details
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - req.startTime;

    logger.info('Outgoing response', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length') || (body ? body.length : 0),
    });

    return originalSend.call(this, body);
  };

  // Handle response finish event for cases where send() isn't called
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;

    if (!res.headersSent) {
      logger.info('Response finished', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
};
