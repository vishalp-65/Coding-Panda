import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';

export interface TracingConfig {
    serviceName: string;
    serviceVersion?: string;
    jaegerEndpoint?: string;
    environment?: string;
}

export class TracingManager {
    private sdk: NodeSDK;
    private tracer: any;
    private serviceName: string;

    constructor(config: TracingConfig) {
        this.serviceName = config.serviceName;

        const jaegerExporter = new JaegerExporter({
            endpoint: config.jaegerEndpoint || 'http://localhost:14268/api/traces',
        });

        this.sdk = new NodeSDK({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
            }),
            traceExporter: jaegerExporter,
            instrumentations: [getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false, // Disable file system instrumentation to reduce noise
                },
            })],
        });

        this.tracer = trace.getTracer(config.serviceName);
    }

    initialize(): void {
        this.sdk.start();
        console.log(`Tracing initialized for service: ${this.serviceName}`);
    }

    shutdown(): Promise<void> {
        return this.sdk.shutdown();
    }

    // Create a new span
    createSpan(name: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
        parent?: any;
    }) {
        const span = this.tracer.startSpan(name, {
            kind: options?.kind || SpanKind.INTERNAL,
            attributes: options?.attributes,
        }, options?.parent);

        return span;
    }

    // Wrap a function with tracing
    async traceFunction<T>(
        name: string,
        fn: (span: any) => Promise<T>,
        options?: {
            kind?: SpanKind;
            attributes?: Record<string, string | number | boolean>;
        }
    ): Promise<T> {
        const span = this.createSpan(name, options);

        try {
            const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            span.recordException(error as Error);
            throw error;
        } finally {
            span.end();
        }
    }

    // Generate correlation ID for request tracking
    generateCorrelationId(): string {
        return uuidv4();
    }

    // Get current trace context
    getCurrentTraceContext() {
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

    // Add attributes to current span
    addAttributes(attributes: Record<string, string | number | boolean>) {
        const span = trace.getActiveSpan();
        if (span) {
            span.setAttributes(attributes);
        }
    }

    // Add event to current span
    addEvent(name: string, attributes?: Record<string, string | number | boolean>) {
        const span = trace.getActiveSpan();
        if (span) {
            span.addEvent(name, attributes);
        }
    }

    // Set span status
    setSpanStatus(code: SpanStatusCode, message?: string) {
        const span = trace.getActiveSpan();
        if (span) {
            span.setStatus({ code, message });
        }
    }

    // Record exception in current span
    recordException(error: Error) {
        const span = trace.getActiveSpan();
        if (span) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            });
        }
    }
}

// Middleware for Express.js to add correlation ID
export function correlationMiddleware() {
    return (req: any, res: any, next: any) => {
        const correlationId = req.headers['x-correlation-id'] || uuidv4();
        req.correlationId = correlationId;
        res.setHeader('x-correlation-id', correlationId);

        // Add correlation ID to current span
        const span = trace.getActiveSpan();
        if (span) {
            span.setAttributes({
                'correlation.id': correlationId,
                'http.method': req.method,
                'http.url': req.url,
                'http.user_agent': req.headers['user-agent'] || '',
            });
        }

        next();
    };
}

// Database query tracing helper
export async function traceDbQuery<T>(
    tracingManager: TracingManager,
    operation: string,
    table: string,
    query: () => Promise<T>
): Promise<T> {
    return tracingManager.traceFunction(
        `db.${operation}`,
        async (span) => {
            span.setAttributes({
                'db.operation': operation,
                'db.table': table,
                'db.system': 'postgresql', // or mongodb, etc.
            });
            return await query();
        },
        { kind: SpanKind.CLIENT }
    );
}

// HTTP request tracing helper
export async function traceHttpRequest<T>(
    tracingManager: TracingManager,
    method: string,
    url: string,
    request: () => Promise<T>
): Promise<T> {
    return tracingManager.traceFunction(
        `http.${method.toLowerCase()}`,
        async (span) => {
            span.setAttributes({
                'http.method': method,
                'http.url': url,
            });
            return await request();
        },
        { kind: SpanKind.CLIENT }
    );
}