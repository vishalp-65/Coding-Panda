import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AuthenticationError, AuthorizationError } from './errors';
import { logger } from './logger';

// Input Sanitization
export class InputSanitizer {
    private static readonly SQL_INJECTION_PATTERNS = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\]))/gi,
        /((\%3C)|(<)).*?((\%3E)|(>))/gi, // XSS patterns
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
    ];

    private static readonly XSS_PATTERNS = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<img[^>]+src[\s]*=[\s]*["\']javascript:/gi,
        /<svg[^>]*onload/gi,
        /<img[^>]*onerror/gi,
    ];

    static sanitizeString(input: string): string {
        if (!input || typeof input !== 'string') return '';

        // Remove null bytes
        let sanitized = input.replace(/\0/g, '');

        // HTML encode dangerous characters
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        return sanitized.trim();
    }

    static detectSQLInjection(input: string): boolean {
        return this.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
    }

    static detectXSS(input: string): boolean {
        return this.XSS_PATTERNS.some(pattern => pattern.test(input));
    }

    static sanitizeObject(obj: any): any {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
            if (this.detectSQLInjection(obj) || this.detectXSS(obj)) {
                throw new Error('Potentially malicious input detected');
            }
            return this.sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        if (typeof obj === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.sanitizeString(key);
                sanitized[sanitizedKey] = this.sanitizeObject(value);
            }
            return sanitized;
        }

        return obj;
    }
}

// Security Headers Middleware
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});

// Rate Limiting
export const createRateLimit = (options: {
    windowMs?: number;
    max?: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
        max: options.max || 100,
        keyGenerator: options.keyGenerator || ((req: Request) => {
            return req.ip || req.connection.remoteAddress || 'unknown';
        }),
        handler: (req: Request, res: Response) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
            });

            res.status(429).json({
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: options.message || 'Too many requests, please try again later',
                    timestamp: new Date().toISOString(),
                },
            });
        },
    });
};

// Input Sanitization Middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body) {
            req.body = InputSanitizer.sanitizeObject(req.body);
        }
        if (req.query) {
            req.query = InputSanitizer.sanitizeObject(req.query);
        }
        if (req.params) {
            req.params = InputSanitizer.sanitizeObject(req.params);
        }
        next();
    } catch (error) {
        logger.warn('Malicious input detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            body: req.body,
            query: req.query,
        });

        res.status(400).json({
            error: {
                code: 'MALICIOUS_INPUT_DETECTED',
                message: 'Request contains potentially malicious content',
                timestamp: new Date().toISOString(),
            },
        });
    }
};

// Data Encryption
export class DataEncryption {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly KEY_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly TAG_LENGTH = 16;

    private static getEncryptionKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        return crypto.scryptSync(key, 'salt', this.KEY_LENGTH);
    }

    static encrypt(text: string): string {
        const key = this.getEncryptionKey();
        const iv = crypto.randomBytes(this.IV_LENGTH);
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
        cipher.setAAD(Buffer.from('ai-platform', 'utf8'));

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }

    static decrypt(encryptedData: string): string {
        const [ivHex, tagHex, encrypted] = encryptedData.split(':');

        if (!ivHex || !tagHex || !encrypted) {
            throw new Error('Invalid encrypted data format');
        }

        const key = this.getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');

        const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
        decipher.setAAD(Buffer.from('ai-platform', 'utf8'));
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    static hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    static generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }
}

// Security Audit Logging
export class SecurityAuditLogger {
    static logAuthenticationAttempt(req: Request, success: boolean, userId?: string, reason?: string) {
        logger.info('Authentication attempt', {
            success,
            userId,
            reason,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            type: 'AUTHENTICATION',
        });
    }

    static logAuthorizationAttempt(req: Request, success: boolean, userId: string, resource: string, action: string) {
        logger.info('Authorization attempt', {
            success,
            userId,
            resource,
            action,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            type: 'AUTHORIZATION',
        });
    }

    static logDataAccess(userId: string, resource: string, action: string, metadata?: any) {
        logger.info('Data access', {
            userId,
            resource,
            action,
            metadata,
            timestamp: new Date().toISOString(),
            type: 'DATA_ACCESS',
        });
    }

    static logSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', details: any) {
        logger.warn('Security event', {
            event,
            severity,
            details,
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT',
        });
    }

    static logSuspiciousActivity(req: Request, activity: string, details: any) {
        logger.warn('Suspicious activity detected', {
            activity,
            details,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            type: 'SUSPICIOUS_ACTIVITY',
        });
    }
}

// CORS Configuration
export const secureCorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
};