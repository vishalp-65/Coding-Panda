export interface SecurityConfig {
    jwt: {
        secret: string;
        accessTokenExpiry: string;
        refreshTokenExpiry: string;
        issuer: string;
        audience: string;
    };
    encryption: {
        key: string;
        algorithm: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        authWindowMs: number;
        maxAuthRequests: number;
    };
    cors: {
        allowedOrigins: string[];
        credentials: boolean;
    };
    security: {
        maxRequestSize: string;
        requestTimeoutMs: number;
        maxLoginAttempts: number;
        lockoutTimeMs: number;
        passwordMinLength: number;
        sessionTimeoutMs: number;
    };
    monitoring: {
        enableSecurityLogging: boolean;
        enableAuditLogging: boolean;
        logLevel: 'error' | 'warn' | 'info' | 'debug';
    };
}

export const getSecurityConfig = (): SecurityConfig => {
    return {
        jwt: {
            secret: process.env.JWT_SECRET || (() => {
                if (process.env.NODE_ENV === 'production') {
                    throw new Error('JWT_SECRET must be set in production');
                }
                return 'dev-secret-key-change-in-production';
            })(),
            accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
            refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
            issuer: process.env.JWT_ISSUER || 'ai-platform',
            audience: process.env.JWT_AUDIENCE || 'ai-platform-users',
        },
        encryption: {
            key: process.env.ENCRYPTION_KEY || (() => {
                if (process.env.NODE_ENV === 'production') {
                    throw new Error('ENCRYPTION_KEY must be set in production');
                }
                return 'dev-encryption-key-change-in-production';
            })(),
            algorithm: 'aes-256-gcm',
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
            authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
            maxAuthRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
        },
        cors: {
            allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
                'http://localhost:3000',
                'http://localhost:3001',
                'https://localhost:3000',
                'https://localhost:3001',
            ],
            credentials: process.env.CORS_CREDENTIALS === 'true',
        },
        security: {
            maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
            requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
            maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
            lockoutTimeMs: parseInt(process.env.LOCKOUT_TIME_MS || '900000', 10), // 15 minutes
            passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
            sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '3600000', 10), // 1 hour
        },
        monitoring: {
            enableSecurityLogging: process.env.ENABLE_SECURITY_LOGGING !== 'false',
            enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
            logLevel: (process.env.LOG_LEVEL as any) || 'info',
        },
    };
};

// Validate security configuration
export const validateSecurityConfig = (config: SecurityConfig): string[] => {
    const errors: string[] = [];

    // JWT validation
    if (!config.jwt.secret || config.jwt.secret.length < 32) {
        errors.push('JWT secret must be at least 32 characters long');
    }

    // Encryption validation
    if (!config.encryption.key || config.encryption.key.length < 16) {
        errors.push('Encryption key must be at least 16 characters long');
    }

    // Rate limit validation
    if (config.rateLimit.maxRequests <= 0) {
        errors.push('Rate limit max requests must be greater than 0');
    }

    if (config.rateLimit.windowMs <= 0) {
        errors.push('Rate limit window must be greater than 0');
    }

    // CORS validation
    if (!config.cors.allowedOrigins || config.cors.allowedOrigins.length === 0) {
        errors.push('At least one allowed origin must be specified');
    }

    // Security validation
    if (config.security.passwordMinLength < 8) {
        errors.push('Password minimum length must be at least 8');
    }

    if (config.security.maxLoginAttempts <= 0) {
        errors.push('Max login attempts must be greater than 0');
    }

    return errors;
};

// Security headers configuration
export const getSecurityHeaders = () => {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    };
};

// Environment-specific security settings
export const getEnvironmentSecuritySettings = () => {
    const env = process.env.NODE_ENV || 'development';

    const baseSettings = {
        development: {
            enableDetailedErrors: true,
            enableDebugLogging: true,
            strictSSL: false,
            allowInsecureConnections: true,
        },
        test: {
            enableDetailedErrors: true,
            enableDebugLogging: false,
            strictSSL: false,
            allowInsecureConnections: true,
        },
        staging: {
            enableDetailedErrors: false,
            enableDebugLogging: false,
            strictSSL: true,
            allowInsecureConnections: false,
        },
        production: {
            enableDetailedErrors: false,
            enableDebugLogging: false,
            strictSSL: true,
            allowInsecureConnections: false,
        },
    };

    return baseSettings[env as keyof typeof baseSettings] || baseSettings.production;
};