import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '@ai-platform/common';
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
const verifyToken = async (token: string): Promise<JWTPayload | null> => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.debug('Token verification failed', { error: error instanceof Error ? error.message : String(error) });
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
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required'
        }
      });
    }
    
    const payload = await verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token'
        }
      });
    }
    
    // Attach user info to request
    req.user = {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      roles: payload.roles
    };
    
    logger.debug('User authenticated', {
      requestId: req.requestId,
      userId: payload.id,
      username: payload.username
    });
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      requestId: req.requestId,
      error
    });
    
    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error'
      }
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
      const payload = await verifyToken(token);
      
      if (payload) {
        req.user = {
          id: payload.id,
          email: payload.email,
          username: payload.username,
          roles: payload.roles
        };
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      requestId: req.requestId,
      error
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
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint'
        }
      });
    }
    
    const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));
    
    if (!hasRequiredRole) {
      logger.warn('Insufficient permissions', {
        requestId: req.requestId,
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredRoles: roles
      });
      
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource'
        }
      });
    }
    
    next();
  };
};

// Admin role requirement
export const requireAdmin = requireRole('admin');

// Moderator role requirement
export const requireModerator = requireRole(['admin', 'moderator']);