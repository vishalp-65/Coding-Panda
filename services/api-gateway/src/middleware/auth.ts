import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger, SecurityAuditLogger, AuthUtils } from '@ai-platform/common';
import { redisClient } from './rate-limit';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        roles: string[];
      };
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

// Extract token from request
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in query params (for WebSocket upgrades)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

// Verify JWT token
const verifyToken = async (token: string, skipRedisCheck = false): Promise<JWTPayload | null> => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Skip Redis checks for optional auth to avoid blocking requests
    if (!skipRedisCheck) {
      try {
        // Check if token is blacklisted in Redis
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
          return null;
        }
      } catch (redisError) {
        logger.warn('Redis blacklist check failed, continuing with token validation', {
          error: redisError instanceof Error ? redisError.message : String(redisError),
        });
        // Continue without Redis check if Redis is unavailable
      }
    }

    return decoded;
  } catch (error) {
    logger.debug('Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

// Main authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      SecurityAuditLogger.logAuthenticationAttempt(req, false, undefined, 'Missing token');
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check for API key authentication as alternative
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey && !token) {
      if (!AuthUtils.validateApiKey(apiKey)) {
        SecurityAuditLogger.logAuthenticationAttempt(req, false, undefined, 'Invalid API key format');
        return res.status(401).json({
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key format',
            timestamp: new Date().toISOString(),
          },
        });
      }
      // TODO: Validate API key against database
      // For now, we'll continue with JWT validation
    }

    const payload = await verifyToken(token);

    if (!payload) {
      SecurityAuditLogger.logAuthenticationAttempt(req, false, undefined, 'Invalid or expired token');
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check for session validity
    const sessionKey = `session:${payload.id}:${token.substring(0, 10)}`;
    const sessionValid = await redisClient.get(sessionKey);

    if (!sessionValid) {
      SecurityAuditLogger.logAuthenticationAttempt(req, false, payload.id, 'Session expired or invalid');
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired, please login again',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update session activity
    await redisClient.setex(sessionKey, 3600, 'active'); // Extend session for 1 hour

    // Attach user info to request
    req.user = {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      roles: payload.roles,
    };

    SecurityAuditLogger.logAuthenticationAttempt(req, true, payload.id);

    logger.debug('User authenticated', {
      requestId: req.requestId || 'unknown',
      userId: payload.id,
      username: payload.username,
    });

    next();
  } catch (error) {
    SecurityAuditLogger.logSecurityEvent(
      'AUTHENTICATION_ERROR',
      'HIGH',
      { error: (error as Error).message, ip: req.ip, path: req.path }
    );

    logger.error('Authentication middleware error', {
      requestId: req.requestId || 'unknown',
      error,
    });

    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = await verifyToken(token, true); // Skip Redis checks for optional auth

      if (payload) {
        // For optional auth, skip session validation to avoid Redis dependency issues
        // Only validate sessions for required auth endpoints
        req.user = {
          id: payload.id,
          email: payload.email,
          username: payload.username,
          roles: payload.roles,
        };
      }
    }

    // Always continue for optional middleware, regardless of token validity
    next();
  } catch (error) {
    logger.debug('Optional authentication middleware error (continuing)', {
      requestId: req.requestId || 'unknown',
      error: error instanceof Error ? error.message : String(error),
    });

    // Continue without authentication for optional middleware
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      SecurityAuditLogger.logAuthorizationAttempt(req, false, 'unknown', req.path, req.method);
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));

    if (!hasRequiredRole) {
      SecurityAuditLogger.logAuthorizationAttempt(req, false, req.user.id, req.path, req.method);

      logger.warn('Insufficient permissions', {
        requestId: req.requestId || 'unknown',
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredRoles: roles,
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          timestamp: new Date().toISOString(),
        },
      });
    }

    SecurityAuditLogger.logAuthorizationAttempt(req, true, req.user.id, req.path, req.method);
    next();
  };
};

// Admin role requirement
export const requireAdmin = requireRole('admin');

// Moderator role requirement
export const requireModerator = requireRole(['admin', 'moderator']);
