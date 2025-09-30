import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from './errors';
import { SecurityAuditLogger } from './security';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  // Track failed login attempts
  private static loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'ai-platform',
      audience: 'ai-platform-users',
    } as SignOptions);
  }

  static generateRefreshToken(payload: Omit<JWTPayload, 'sessionId'>): string {
    const sessionId = uuidv4();
    return jwt.sign({ ...payload, sessionId }, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'ai-platform',
      audience: 'ai-platform-users',
    } as SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_SECRET, {
      issuer: 'ai-platform',
      audience: 'ai-platform-users',
    }) as JWTPayload;
  }

  static generateSessionId(): string {
    return uuidv4();
  }

  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      errors.push('Password cannot contain common patterns');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static checkLoginAttempts(identifier: string): boolean {
    const attempts = this.loginAttempts.get(identifier);

    if (!attempts) return true;

    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();

    // Reset attempts after lockout time
    if (timeSinceLastAttempt > this.LOCKOUT_TIME) {
      this.loginAttempts.delete(identifier);
      return true;
    }

    return attempts.count < this.MAX_LOGIN_ATTEMPTS;
  }

  static recordFailedLogin(identifier: string): void {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
    attempts.count += 1;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(identifier, attempts);
  }

  static clearFailedLogins(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateApiKey(): string {
    const prefix = 'ap_'; // ai-platform prefix
    const key = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${key}`;
  }

  static validateApiKey(apiKey: string): boolean {
    return /^ap_[A-Za-z0-9_-]{43}$/.test(apiKey);
  }
}

// Authentication Middleware
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check for API key authentication
    if (apiKey) {
      if (!AuthUtils.validateApiKey(apiKey)) {
        SecurityAuditLogger.logAuthenticationAttempt(req, false, undefined, 'Invalid API key format');
        throw new AuthenticationError('Invalid API key format');
      }

      // TODO: Validate API key against database
      // For now, we'll skip to JWT validation
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      SecurityAuditLogger.logAuthenticationAttempt(req, false, undefined, 'Missing or invalid authorization header');
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = AuthUtils.verifyToken(token);

    req.user = payload;
    SecurityAuditLogger.logAuthenticationAttempt(req, true, payload.userId);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      SecurityAuditLogger.logAuthenticationAttempt(req, false, undefined, error.message);
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
        },
      });
    }

    next(error);
  }
};

// Authorization Middleware
export const authorize = (requiredRoles: string[] = [], requiredPermissions: string[] = []) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const { userId, roles } = req.user;

      // Check roles
      if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role => roles.includes(role));
        if (!hasRequiredRole) {
          SecurityAuditLogger.logAuthorizationAttempt(
            req,
            false,
            userId,
            req.path,
            req.method
          );
          throw new AuthorizationError('Insufficient permissions');
        }
      }

      // TODO: Implement permission-based authorization
      // This would require a more complex RBAC system

      SecurityAuditLogger.logAuthorizationAttempt(
        req,
        true,
        userId,
        req.path,
        req.method
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Optional authentication (for public endpoints that can benefit from user context)
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = AuthUtils.verifyToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};
