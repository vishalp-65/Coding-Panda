import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '../middleware/error-handler';
import { CorsConfig, RateLimitConfig } from '../config/base-config';

export interface AppConfig {
    serviceName: string;
    version: string;
    cors: CorsConfig;
    rateLimit: RateLimitConfig;
    trustProxy?: boolean;
}

export function createBaseApp(config: AppConfig): express.Application {
    const app = express();

    // Security middleware
    app.use(helmet());

    // CORS configuration
    app.use(cors(config.cors));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message: {
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this IP, please try again later.',
                timestamp: new Date().toISOString(),
            },
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy for accurate IP addresses
    if (config.trustProxy) {
        app.set('trust proxy', 1);
    }

    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            success: true,
            message: config.serviceName,
            version: config.version,
            timestamp: new Date().toISOString(),
        });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            service: config.serviceName,
            timestamp: new Date().toISOString(),
        });
    });

    return app;
}

export function finalizeApp(app: express.Application): void {
    // 404 handler
    app.use('*', (req, res) => {
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: 'Endpoint not found',
                timestamp: new Date().toISOString(),
            },
        });
    });

    // Global error handler
    app.use(errorHandler);
}