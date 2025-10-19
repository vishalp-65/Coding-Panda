import { Request, Response, NextFunction } from 'express';
import { getUserServiceClient, makeResilientCall } from '../grpc/clients';
import { logger } from '@ai-platform/common';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
        roles: string[];
        isActive: boolean;
        isVerified: boolean;
    };
    requestId?: string;
}

/**
 * gRPC-based authentication middleware
 */
export const grpcAuthMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Authorization token is required'
                }
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Validate token using User Service via gRPC
        const response = await makeResilientCall<any>(
            'UserService',
            'validateToken',
            { token },
            {
                requestId: req.requestId || 'unknown',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        if (!response.base?.success || !response.valid) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token'
                }
            });
        }

        if (!response.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User associated with token not found'
                }
            });
        }

        // Check if user is active
        if (!response.user.isActive) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'USER_INACTIVE',
                    message: 'User account is inactive'
                }
            });
        }

        // Attach user information to request
        req.user = {
            id: response.user.id,
            email: response.user.email,
            username: response.user.username,
            roles: response.user.roles || ['user'],
            isActive: response.user.isActive,
            isVerified: response.user.isVerified
        };

        logger.debug('User authenticated via gRPC', {
            requestId: req.requestId,
            userId: req.user.id,
            username: req.user.username
        });

        next();
    } catch (error) {
        logger.error('gRPC authentication error', {
            requestId: req.requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        return res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_SERVICE_ERROR',
                message: 'Authentication service temporarily unavailable'
            }
        });
    }
};

/**
 * Optional gRPC-based authentication middleware
 * Continues even if authentication fails
 */
export const optionalGrpcAuthMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continue without authentication
        }

        const token = authHeader.substring(7);

        try {
            const response = await makeResilientCall<any>(
                'UserService',
                'validateToken',
                { token },
                {
                    requestId: req.requestId || 'unknown',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            );

            if (response.base?.success && response.valid && response.user && response.user.isActive) {
                req.user = {
                    id: response.user.id,
                    email: response.user.email,
                    username: response.user.username,
                    roles: response.user.roles || ['user'],
                    isActive: response.user.isActive,
                    isVerified: response.user.isVerified
                };

                logger.debug('User optionally authenticated via gRPC', {
                    requestId: req.requestId,
                    userId: req.user.id,
                    username: req.user.username
                });
            }
        } catch (error) {
            logger.warn('Optional gRPC authentication failed, continuing without auth', {
                requestId: req.requestId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        next();
    } catch (error) {
        logger.error('Optional gRPC authentication middleware error', {
            requestId: req.requestId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Continue without authentication on error
        next();
    }
};

/**
 * Role-based authorization middleware using gRPC-authenticated user
 */
export const requireRole = (allowedRoles: string | string[]) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication is required for this endpoint'
                }
            });
        }

        const userRoles = req.user.roles || [];
        const hasRequiredRole = roles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            logger.warn('Insufficient permissions', {
                requestId: req.requestId,
                userId: req.user.id,
                userRoles,
                requiredRoles: roles
            });

            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: `This endpoint requires one of the following roles: ${roles.join(', ')}`
                }
            });
        }

        next();
    };
};

/**
 * Middleware to check if user is verified
 */
export const requireVerification = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication is required for this endpoint'
            }
        });
    }

    if (!req.user.isVerified) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'EMAIL_VERIFICATION_REQUIRED',
                message: 'Email verification is required to access this endpoint'
            }
        });
    }

    next();
};

/**
 * Middleware to refresh token if it's about to expire
 */
export const autoRefreshToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);

        // Check token expiration (this would need to be implemented in the User Service)
        const response = await makeResilientCall<any>(
            'UserService',
            'validateToken',
            { token },
            {
                requestId: req.requestId || 'unknown'
            }
        );

        if (response.base?.success && response.valid && response.expiresAt) {
            const expirationTime = new Date(response.expiresAt).getTime();
            const currentTime = Date.now();
            const timeUntilExpiration = expirationTime - currentTime;

            // If token expires in less than 5 minutes, add refresh header
            if (timeUntilExpiration < 5 * 60 * 1000) {
                res.setHeader('X-Token-Refresh-Suggested', 'true');
                res.setHeader('X-Token-Expires-At', response.expiresAt);
            }
        }

        next();
    } catch (error) {
        logger.error('Auto refresh token middleware error', {
            requestId: req.requestId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Continue on error
        next();
    }
};