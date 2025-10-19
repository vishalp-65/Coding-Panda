import {
    ServerInterceptor,
    ServerInterceptingCall,
    InterceptingCall,
    status,
    Metadata
} from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logging interceptor for gRPC calls
 */
export function createLoggingInterceptor(): ServerInterceptor {
    return (methodDescriptor, call) => {
        const startTime = Date.now();
        const requestId = call.metadata.get('request-id')?.[0] || uuidv4();

        console.log(`[gRPC] ${methodDescriptor.path} - Request started`, {
            requestId,
            method: methodDescriptor.path,
            timestamp: new Date().toISOString()
        });

        const interceptingCall = new InterceptingCall(call, {
            sendMessage: (message) => {
                console.log(`[gRPC] ${methodDescriptor.path} - Sending response`, {
                    requestId,
                    duration: Date.now() - startTime
                });
                call.sendMessage(message);
            },

            sendStatus: (statusObj) => {
                const duration = Date.now() - startTime;
                const logLevel = statusObj.code === status.OK ? 'info' : 'error';

                console.log(`[gRPC] ${methodDescriptor.path} - Request completed`, {
                    requestId,
                    statusCode: statusObj.code,
                    statusMessage: statusObj.details,
                    duration,
                    level: logLevel
                });

                call.sendStatus(statusObj);
            }
        });

        return interceptingCall;
    };
}

/**
 * Authentication interceptor for gRPC calls
 */
export function createAuthInterceptor(
    publicMethods: string[] = []
): ServerInterceptor {
    return (methodDescriptor, call) => {
        const methodPath = methodDescriptor.path;

        // Skip authentication for public methods
        if (publicMethods.includes(methodPath)) {
            return new InterceptingCall(call);
        }

        // Check for authentication token
        const authHeader = call.metadata.get('authorization')?.[0] as string;
        const userId = call.metadata.get('user-id')?.[0] as string;

        if (!authHeader && !userId) {
            call.sendStatus({
                code: status.UNAUTHENTICATED,
                details: 'Authentication required'
            });
            return new InterceptingCall(call);
        }

        // Add user information to metadata for downstream processing
        if (userId) {
            call.metadata.set('authenticated-user-id', userId);
        }

        return new InterceptingCall(call);
    };
}

/**
 * Metrics interceptor for gRPC calls
 */
export function createMetricsInterceptor(): ServerInterceptor {
    const methodCounts = new Map<string, number>();
    const methodDurations = new Map<string, number[]>();
    const methodErrors = new Map<string, number>();

    return (methodDescriptor, call) => {
        const startTime = Date.now();
        const methodPath = methodDescriptor.path;

        // Increment method call count
        methodCounts.set(methodPath, (methodCounts.get(methodPath) || 0) + 1);

        const interceptingCall = new InterceptingCall(call, {
            sendStatus: (statusObj) => {
                const duration = Date.now() - startTime;

                // Track duration
                if (!methodDurations.has(methodPath)) {
                    methodDurations.set(methodPath, []);
                }
                methodDurations.get(methodPath)!.push(duration);

                // Track errors
                if (statusObj.code !== status.OK) {
                    methodErrors.set(methodPath, (methodErrors.get(methodPath) || 0) + 1);
                }

                call.sendStatus(statusObj);
            }
        });

        return interceptingCall;
    };
}

/**
 * Rate limiting interceptor for gRPC calls
 */
export function createRateLimitInterceptor(
    maxRequestsPerMinute: number = 100
): ServerInterceptor {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    return (methodDescriptor, call) => {
        const clientId = call.metadata.get('user-id')?.[0] as string ||
            call.metadata.get('client-id')?.[0] as string ||
            call.getPeer();

        const now = Date.now();
        const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window

        const clientData = requestCounts.get(clientId);

        if (!clientData || clientData.resetTime < windowStart) {
            requestCounts.set(clientId, { count: 1, resetTime: windowStart + 60000 });
        } else {
            clientData.count++;

            if (clientData.count > maxRequestsPerMinute) {
                call.sendStatus({
                    code: status.RESOURCE_EXHAUSTED,
                    details: 'Rate limit exceeded'
                });
                return new InterceptingCall(call);
            }
        }

        return new InterceptingCall(call);
    };
}

/**
 * Validation interceptor for gRPC calls
 */
export function createValidationInterceptor(): ServerInterceptor {
    return (methodDescriptor, call) => {
        const interceptingCall = new InterceptingCall(call, {
            receiveMessage: (message) => {
                try {
                    // Basic validation - check if message is not null/undefined
                    if (!message) {
                        call.sendStatus({
                            code: status.INVALID_ARGUMENT,
                            details: 'Request message cannot be empty'
                        });
                        return;
                    }

                    // Validate metadata if present
                    if (message.metadata) {
                        const metadata = message.metadata;
                        if (!metadata.requestId) {
                            // Add request ID if not present
                            metadata.requestId = uuidv4();
                        }
                    }

                    call.receiveMessage(message);
                } catch (error) {
                    call.sendStatus({
                        code: status.INVALID_ARGUMENT,
                        details: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                }
            }
        });

        return interceptingCall;
    };
}

/**
 * Error handling interceptor for gRPC calls
 */
export function createErrorHandlingInterceptor(): ServerInterceptor {
    return (methodDescriptor, call) => {
        const interceptingCall = new InterceptingCall(call, {
            sendStatus: (statusObj) => {
                // Log errors for monitoring
                if (statusObj.code !== status.OK) {
                    console.error(`[gRPC Error] ${methodDescriptor.path}`, {
                        code: statusObj.code,
                        message: statusObj.details,
                        metadata: statusObj.metadata?.getMap()
                    });
                }

                call.sendStatus(statusObj);
            }
        });

        return interceptingCall;
    };
}

/**
 * Timeout interceptor for gRPC calls
 */
export function createTimeoutInterceptor(
    timeoutMs: number = 30000
): ServerInterceptor {
    return (methodDescriptor, call) => {
        const timeout = setTimeout(() => {
            call.sendStatus({
                code: status.DEADLINE_EXCEEDED,
                details: 'Request timeout'
            });
        }, timeoutMs);

        const interceptingCall = new InterceptingCall(call, {
            sendStatus: (statusObj) => {
                clearTimeout(timeout);
                call.sendStatus(statusObj);
            }
        });

        return interceptingCall;
    };
}

/**
 * Combine multiple interceptors
 */
export function combineInterceptors(...interceptors: ServerInterceptor[]): ServerInterceptor {
    return (methodDescriptor, call) => {
        let currentCall = call;

        for (const interceptor of interceptors.reverse()) {
            currentCall = interceptor(methodDescriptor, currentCall);
        }

        return currentCall;
    };
}