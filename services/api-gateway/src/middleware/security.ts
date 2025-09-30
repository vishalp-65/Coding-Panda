import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import {
  securityMiddleware as commonSecurityMiddleware,
  sanitizeInput,
  suspiciousActivityDetector,
  validateContentType,
  requestTimeout,
  securityMonitoring,
  SecurityAuditLogger,
  InputSanitizer,
} from '@ai-platform/common';

// Configure helmet with security headers
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API gateway
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Enhanced security middleware stack
export const enhancedSecurityMiddleware = [
  // Request timeout
  requestTimeout(30000), // 30 seconds

  // Security monitoring
  securityMonitoring,

  // Input sanitization
  sanitizeInput,

  // Content type validation
  validateContentType(['application/json', 'multipart/form-data']),

  // Suspicious activity detection
  suspiciousActivityDetector,
];

// Additional security middleware
export const additionalSecurityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Remove server header
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Request-ID', generateRequestId());

  // Prevent caching of sensitive endpoints
  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Log security-relevant requests
  if (req.path.includes('/auth') || req.path.includes('/admin') || req.path.includes('/api/v1/users')) {
    SecurityAuditLogger.logSecurityEvent(
      'SENSITIVE_ENDPOINT_ACCESS',
      'LOW',
      {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );
  }

  next();
};

// Request ID generation
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Input validation middleware for specific endpoints
export const validateApiInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Additional validation for API endpoints
    if (req.body) {
      // Check for oversized payloads
      const bodySize = JSON.stringify(req.body).length;
      if (bodySize > 1024 * 1024) { // 1MB limit
        SecurityAuditLogger.logSecurityEvent(
          'OVERSIZED_PAYLOAD',
          'MEDIUM',
          { size: bodySize, ip: req.ip, path: req.path }
        );

        return res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request payload exceeds maximum size limit',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Validate JSON structure depth
      const maxDepth = 10;
      if (getObjectDepth(req.body) > maxDepth) {
        SecurityAuditLogger.logSecurityEvent(
          'DEEP_OBJECT_STRUCTURE',
          'MEDIUM',
          { depth: getObjectDepth(req.body), ip: req.ip, path: req.path }
        );

        return res.status(400).json({
          error: {
            code: 'INVALID_STRUCTURE',
            message: 'Request structure is too complex',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    next();
  } catch (error) {
    SecurityAuditLogger.logSecurityEvent(
      'INPUT_VALIDATION_ERROR',
      'HIGH',
      { error: (error as Error).message, ip: req.ip, path: req.path }
    );

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request format',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// Helper function to calculate object depth
function getObjectDepth(obj: any, depth = 0): number {
  if (obj === null || typeof obj !== 'object') {
    return depth;
  }

  const depths = Object.values(obj).map(value => getObjectDepth(value, depth + 1));
  return Math.max(...depths, depth);
}

// Security headers for different endpoint types
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // API-specific security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent MIME type sniffing
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
};
