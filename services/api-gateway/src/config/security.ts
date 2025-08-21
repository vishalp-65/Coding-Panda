import { getSecurityConfig, validateSecurityConfig } from '@ai-platform/common';

// API Gateway specific security configuration
export interface ApiGatewaySecurityConfig {
    // Rate limiting
    rateLimiting: {
        general: {
            windowMs: number;
            maxRequests: number;
        };
        auth: {
            windowMs: number;
            maxRequests: number;
        };
        admin: {
            windowMs: number;
            maxRequests: number;
        };
        upload: {
            windowMs: number;
            maxRequests: number;
        };
        search: {
            windowMs: number;
            maxRequests: number;
        };
    };

    // Request validation
    validation: {
        maxPayloadSize: string;
        maxObjectDepth: number;
        allowedContentTypes: string[];
    };

    // Security monitoring
    monitoring: {
        enableSuspiciousActivityDetection: boolean;
        enableSecurityLogging: boolean;
        logSensitiveEndpoints: boolean;
    };

    // Session management
    session: {
        extendOnActivity: boolean;
        maxSessionDuration: number;
        cleanupInterval: number;
    };

    // IP filtering
    ipFiltering: {
        enabled: boolean;
        whitelist: string[];
        blacklist: string[];
    };
}

export const getApiGatewaySecurityConfig = (): ApiGatewaySecurityConfig => {
    return {
        rateLimiting: {
            general: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
            },
            auth: {
                windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
                maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
            },
            admin: {
                windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || '300000', 10), // 5 minutes
                maxRequests: parseInt(process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS || '10', 10),
            },
            upload: {
                windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
                maxRequests: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS || '5', 10),
            },
            search: {
                windowMs: parseInt(process.env.SEARCH_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
                maxRequests: parseInt(process.env.SEARCH_RATE_LIMIT_MAX_REQUESTS || '30', 10),
            },
        },
        validation: {
            maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '10mb',
            maxObjectDepth: parseInt(process.env.MAX_OBJECT_DEPTH || '10', 10),
            allowedContentTypes: process.env.ALLOWED_CONTENT_TYPES?.split(',') || [
                'application/json',
                'multipart/form-data',
                'application/x-www-form-urlencoded',
            ],
        },
        monitoring: {
            enableSuspiciousActivityDetection: process.env.ENABLE_SUSPICIOUS_ACTIVITY_DETECTION !== 'false',
            enableSecurityLogging: process.env.ENABLE_SECURITY_LOGGING !== 'false',
            logSensitiveEndpoints: process.env.LOG_SENSITIVE_ENDPOINTS !== 'false',
        },
        session: {
            extendOnActivity: process.env.EXTEND_SESSION_ON_ACTIVITY !== 'false',
            maxSessionDuration: parseInt(process.env.MAX_SESSION_DURATION || '86400000', 10), // 24 hours
            cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '3600000', 10), // 1 hour
        },
        ipFiltering: {
            enabled: process.env.ENABLE_IP_FILTERING === 'true',
            whitelist: process.env.IP_WHITELIST?.split(',') || [],
            blacklist: process.env.IP_BLACKLIST?.split(',') || [],
        },
    };
};

// Validate API Gateway security configuration
export const validateApiGatewaySecurityConfig = (config: ApiGatewaySecurityConfig): string[] => {
    const errors: string[] = [];

    // Validate rate limiting configuration
    Object.entries(config.rateLimiting).forEach(([key, rateLimitConfig]) => {
        if (rateLimitConfig.windowMs <= 0) {
            errors.push(`Rate limiting ${key} window must be greater than 0`);
        }
        if (rateLimitConfig.maxRequests <= 0) {
            errors.push(`Rate limiting ${key} max requests must be greater than 0`);
        }
    });

    // Validate payload size
    if (!config.validation.maxPayloadSize.match(/^\d+[kmg]?b$/i)) {
        errors.push('Invalid max payload size format');
    }

    // Validate object depth
    if (config.validation.maxObjectDepth <= 0 || config.validation.maxObjectDepth > 50) {
        errors.push('Max object depth must be between 1 and 50');
    }

    // Validate content types
    if (config.validation.allowedContentTypes.length === 0) {
        errors.push('At least one content type must be allowed');
    }

    // Validate session configuration
    if (config.session.maxSessionDuration <= 0) {
        errors.push('Max session duration must be greater than 0');
    }

    if (config.session.cleanupInterval <= 0) {
        errors.push('Session cleanup interval must be greater than 0');
    }

    return errors;
};

// Initialize and validate security configuration
export const initializeSecurityConfig = () => {
    // Get base security configuration
    const baseConfig = getSecurityConfig();
    const baseErrors = validateSecurityConfig(baseConfig);

    if (baseErrors.length > 0) {
        throw new Error(`Base security configuration errors: ${baseErrors.join(', ')}`);
    }

    // Get API Gateway specific configuration
    const apiGatewayConfig = getApiGatewaySecurityConfig();
    const apiGatewayErrors = validateApiGatewaySecurityConfig(apiGatewayConfig);

    if (apiGatewayErrors.length > 0) {
        throw new Error(`API Gateway security configuration errors: ${apiGatewayErrors.join(', ')}`);
    }

    return {
        base: baseConfig,
        apiGateway: apiGatewayConfig,
    };
};

// Security configuration for different environments
export const getEnvironmentSecurityOverrides = () => {
    const env = process.env.NODE_ENV || 'development';

    const overrides = {
        development: {
            rateLimiting: {
                general: { maxRequests: 1000 }, // More lenient for development
                auth: { maxRequests: 20 },
            },
            monitoring: {
                enableSuspiciousActivityDetection: false, // Disable for development
            },
        },
        test: {
            rateLimiting: {
                general: { maxRequests: 10000 }, // Very lenient for tests
                auth: { maxRequests: 100 },
            },
            monitoring: {
                enableSuspiciousActivityDetection: false,
                enableSecurityLogging: false,
            },
        },
        staging: {
            rateLimiting: {
                general: { maxRequests: 200 }, // Stricter than development
                auth: { maxRequests: 10 },
            },
            monitoring: {
                enableSuspiciousActivityDetection: true,
                enableSecurityLogging: true,
            },
        },
        production: {
            rateLimiting: {
                general: { maxRequests: 100 }, // Strictest
                auth: { maxRequests: 5 },
            },
            monitoring: {
                enableSuspiciousActivityDetection: true,
                enableSecurityLogging: true,
                logSensitiveEndpoints: true,
            },
        },
    };

    return overrides[env as keyof typeof overrides] || overrides.production;
};