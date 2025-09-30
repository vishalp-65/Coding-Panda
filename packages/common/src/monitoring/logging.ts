import winston from 'winston';
import { trace } from '@opentelemetry/api';

export interface LoggingConfig {
    serviceName: string;
    level?: string;
    environment?: string;
    logToFile?: boolean;
    logFilePath?: string;
}

export class Logger {
    private logger: winston.Logger;
    private serviceName: string;

    constructor(config: LoggingConfig) {
        this.serviceName = config.serviceName;

        const transports: winston.transport[] = [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        const traceContext = this.getTraceContext();
                        const traceInfo = traceContext
                            ? `[trace_id=${traceContext.traceId} span_id=${traceContext.spanId}]`
                            : '';

                        return `${timestamp} ${level} [${this.serviceName}] ${traceInfo} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''
                            }`;
                    })
                ),
            }),
        ];

        if (config.logToFile) {
            transports.push(
                new winston.transports.File({
                    filename: config.logFilePath || `/var/log/app/${config.serviceName}.log`,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                })
            );
        }

        this.logger = winston.createLogger({
            level: config.level || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: {
                service: config.serviceName,
                environment: config.environment || 'development',
            },
            transports,
        });
    }

    private getTraceContext() {
        const span = trace.getActiveSpan();
        if (span) {
            const spanContext = span.spanContext();
            return {
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
            };
        }
        return null;
    }

    private enrichLogData(data: any = {}) {
        const traceContext = this.getTraceContext();
        return {
            ...data,
            ...(traceContext && {
                trace_id: traceContext.traceId,
                span_id: traceContext.spanId,
            }),
            timestamp: new Date().toISOString(),
            service: this.serviceName,
        };
    }

    debug(message: string, meta?: any) {
        this.logger.debug(message, this.enrichLogData(meta));
    }

    info(message: string, meta?: any) {
        this.logger.info(message, this.enrichLogData(meta));
    }

    warn(message: string, meta?: any) {
        this.logger.warn(message, this.enrichLogData(meta));
    }

    error(message: string, error?: Error | any, meta?: any) {
        const errorData = error instanceof Error
            ? { error: error.message, stack: error.stack }
            : { error };

        this.logger.error(message, this.enrichLogData({ ...errorData, ...meta }));
    }

    // Structured logging methods for specific use cases
    logHttpRequest(req: any, res: any, duration: number) {
        this.info('HTTP Request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration,
            user_agent: req.headers['user-agent'],
            ip: req.ip,
            correlation_id: req.correlationId,
        });
    }

    logDatabaseQuery(operation: string, table: string, duration: number, rowCount?: number) {
        this.debug('Database Query', {
            operation,
            table,
            duration,
            row_count: rowCount,
        });
    }

    logBusinessEvent(event: string, data: any) {
        this.info('Business Event', {
            event,
            ...data,
        });
    }

    logSecurityEvent(event: string, data: any) {
        this.warn('Security Event', {
            event,
            ...data,
        });
    }

    logPerformanceMetric(metric: string, value: number, unit: string) {
        this.info('Performance Metric', {
            metric,
            value,
            unit,
        });
    }

    // Error logging with different severity levels
    logCriticalError(message: string, error: Error, context?: any) {
        this.error(`CRITICAL: ${message}`, error, { severity: 'critical', ...context });
    }

    logApplicationError(message: string, error: Error, context?: any) {
        this.error(`APPLICATION: ${message}`, error, { severity: 'error', ...context });
    }

    logValidationError(message: string, validationErrors: any, context?: any) {
        this.warn(`VALIDATION: ${message}`, {
            validation_errors: validationErrors,
            severity: 'warning',
            ...context
        });
    }
}

// Express middleware for request logging
export function requestLoggingMiddleware(logger: Logger) {
    return (req: any, res: any, next: any) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.logHttpRequest(req, res, duration);
        });

        next();
    };
}

// Error handling middleware
export function errorLoggingMiddleware(logger: Logger) {
    return (error: Error, req: any, res: any, next: any) => {
        logger.logApplicationError('Unhandled request error', error, {
            method: req.method,
            url: req.url,
            correlation_id: req.correlationId,
        });

        next(error);
    };
}

// Process error handlers
export function setupProcessErrorHandlers(logger: Logger) {
    process.on('uncaughtException', (error) => {
        logger.logCriticalError('Uncaught Exception', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.logCriticalError('Unhandled Rejection', new Error(String(reason)), {
            promise: promise.toString(),
        });
    });

    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
    });

    process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
    });
}