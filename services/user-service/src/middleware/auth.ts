import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '@ai-platform/common';
import { UserService } from '../services';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = AuthUtils.verifyToken(token);

    // Verify user still exists and is active
    const userService = new UserService();
    const user = await userService.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export const authorize = (requiredRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const hasRequiredRole = requiredRoles.some(role =>
      req.user!.roles.includes(role)
    );

    if (!hasRequiredRole) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = AuthUtils.verifyToken(token);

      const userService = new UserService();
      const user = await userService.getUserById(payload.userId);

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          roles: user.roles,
        };
      }
    }
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
