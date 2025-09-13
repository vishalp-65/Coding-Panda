import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
}

export interface JWTConfig {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
}

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
}

export interface RateLimitConfig {
    windowMs: number;
    max: number;
}

export interface CorsConfig {
    origin: string;
    credentials: boolean;
}

export abstract class BaseConfig {
    public readonly port: number;
    public readonly nodeEnv: string;
    public readonly debug: boolean;

    constructor() {
        this.port = parseInt(process.env.PORT || '3000');
        this.nodeEnv = process.env.NODE_ENV || 'development';
        this.debug = this.nodeEnv === 'development';
    }

    protected getDatabaseConfig(prefix: string = 'DB'): DatabaseConfig {
        return {
            host: process.env[`${prefix}_HOST`] || 'localhost',
            port: parseInt(process.env[`${prefix}_PORT`] || '5432'),
            username: process.env[`${prefix}_USERNAME`] || 'user',
            password: process.env[`${prefix}_PASSWORD`] || 'password',
            name: process.env[`${prefix}_NAME`] || 'database',
            ssl: process.env[`${prefix}_SSL`] === 'true',
        };
    }

    protected getJWTConfig(): JWTConfig {
        return {
            secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
            accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
            refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        };
    }

    protected getEmailConfig(): EmailConfig {
        return {
            host: process.env.EMAIL_HOST || 'localhost',
            port: parseInt(process.env.EMAIL_PORT || '1025'),
            secure: process.env.EMAIL_SECURE === 'true',
            user: process.env.EMAIL_USER || '',
            password: process.env.EMAIL_PASSWORD || '',
            from: process.env.EMAIL_FROM || 'noreply@ai-platform.com',
        };
    }

    protected getRateLimitConfig(): RateLimitConfig {
        return {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        };
    }

    protected getCorsConfig(): CorsConfig {
        return {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
        };
    }

    protected getRedisUrl(): string {
        return process.env.REDIS_URL || 'redis://localhost:6379/0';
    }

    protected validateRequiredEnvVars(requiredVars: string[]): void {
        const missing = requiredVars.filter(varName => !process.env[varName]);

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
}