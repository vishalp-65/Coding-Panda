import { Request, Response, NextFunction } from 'express';
import {
    securityHeaders,
    sanitizeInput,
    createRateLimit,
    secureCorsOptions,
    SecurityAuditLogger,
    DataEncryption
} from '../security';
import { AuthenticationError } from '../errors';
import { logger } from '../logger';
import cors from 'cors';

// Comprehensive security middleware stack
export const securityMiddleware = [
    // CORS
    cors(secureCorsOptions),

    // Security headers
    securityHeaders,

    // Input sanitization
    sanitizeInput,

    // General rate limiting
    createRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later',
    }),
];

// Strict rate limiting for authentication endpoints
export const authRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    keyGenerator: (req: Request) => {
        // Use IP + user identifier for more granular limiting
        const userIdentifier = req.body?.email || req.body?.username || '';
        return `${req.ip}:${userIdentifier}`;
    },
});

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return next(); // API key is optional, let other auth methods handle it
    }

    try {
        // Basic format validation
        if (!/^ap_[A-Za-z0-9_-]{43}$/.test(apiKey)) {
            SecurityAuditLogger.logSecurityEvent(
                'INVALID_API_KEY_FORMAT',
                'MEDIUM',
                { ip: req.ip, apiKey: apiKey.substring(0, 10) + '...' }
            );
            throw new AuthenticationError('Invalid API key format');
        }

        // TODO: Validate against database
        // For now, we'll accept any properly formatted key

        next();
    } catch (error) {
        next(error);
    }
};

// Request size limiting
export const requestSizeLimit = (maxSize: string = '10mb') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = req.headers['content-length'];

        if (contentLength) {
            const sizeInBytes = parseInt(contentLength, 10);
            const maxSizeInBytes = parseSize(maxSize);

            if (sizeInBytes > maxSizeInBytes) {
                SecurityAuditLogger.logSecurityEvent(
                    'REQUEST_SIZE_EXCEEDED',
                    'MEDIUM',
                    { ip: req.ip, size: sizeInBytes, maxSize: maxSizeInBytes }
                );

                return res.status(413).json({
                    error: {
                        code: 'REQUEST_TOO_LARGE',
                        message: `Request size exceeds maximum allowed size of ${maxSize}`,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        next();
    };
};

// IP whitelist/blacklist middleware
export const ipFilter = (options: {
    whitelist?: string[];
    blacklist?: string[];
}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIp = req.ip || req.connection.remoteAddress || '';

        // Check blacklist first
        if (options.blacklist && options.blacklist.includes(clientIp)) {
            SecurityAuditLogger.logSecurityEvent(
                'BLACKLISTED_IP_ACCESS',
                'HIGH',
                { ip: clientIp, path: req.path }
            );

            return res.status(403).json({
                error: {
                    code: 'IP_BLOCKED',
                    message: 'Access denied from this IP address',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Check whitelist if provided
        if (options.whitelist && options.whitelist.length > 0) {
            if (!options.whitelist.includes(clientIp)) {
                SecurityAuditLogger.logSecurityEvent(
                    'NON_WHITELISTED_IP_ACCESS',
                    'MEDIUM',
                    { ip: clientIp, path: req.path }
                );

                return res.status(403).json({
                    error: {
                        code: 'IP_NOT_ALLOWED',
                        message: 'Access denied from this IP address',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        next();
    };
};

// Suspicious activity detection
export const suspiciousActivityDetector = (req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
        // SQL injection attempts
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        // XSS attempts
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        // Path traversal attempts
        /\.\.[\/\\]/g,
        // Command injection attempts
        /[;&|`$(){}[\]]/g,
    ];

    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
    });

    const suspiciousActivity = suspiciousPatterns.some(pattern => pattern.test(requestData));

    if (suspiciousActivity) {
        SecurityAuditLogger.logSuspiciousActivity(req, 'MALICIOUS_PATTERN_DETECTED', {
            patterns: suspiciousPatterns.map(p => p.toString()),
            requestData: requestData.substring(0, 500), // Limit log size
        });

        // Don't block immediately, but log for analysis
        // In production, you might want to block or require additional verification
    }

    next();
};

// Content type validation
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return next(); // Skip for methods that typically don't have body
        }

        const contentType = req.headers['content-type'];

        if (!contentType) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_CONTENT_TYPE',
                    message: 'Content-Type header is required',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const isAllowed = allowedTypes.some(type => contentType.includes(type));

        if (!isAllowed) {
            SecurityAuditLogger.logSecurityEvent(
                'INVALID_CONTENT_TYPE',
                'LOW',
                { ip: req.ip, contentType, allowedTypes }
            );

            return res.status(415).json({
                error: {
                    code: 'UNSUPPORTED_MEDIA_TYPE',
                    message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        next();
    };
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                SecurityAuditLogger.logSecurityEvent(
                    'REQUEST_TIMEOUT',
                    'MEDIUM',
                    { ip: req.ip, path: req.path, method: req.method, timeout: timeoutMs }
                );

                res.status(408).json({
                    error: {
                        code: 'REQUEST_TIMEOUT',
                        message: 'Request timeout',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }, timeoutMs);

        res.on('finish', () => {
            clearTimeout(timeout);
        });

        res.on('close', () => {
            clearTimeout(timeout);
        });

        next();
    };
};

// Helper function to parse size strings
function parseSize(size: string): number {
    const units: { [key: string]: number } = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024,
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);

    if (!match) {
        throw new Error(`Invalid size format: ${size}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return value * units[unit];
}

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log request details
    logger.info('Request received', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
    });

    // Monitor response
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        logger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            timestamp: new Date().toISOString(),
        });

        // Log suspicious response codes
        if (res.statusCode >= 400) {
            SecurityAuditLogger.logSecurityEvent(
                'HTTP_ERROR_RESPONSE',
                res.statusCode >= 500 ? 'HIGH' : 'MEDIUM',
                {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    ip: req.ip,
                    duration,
                }
            );
        }
    });

    next();
};