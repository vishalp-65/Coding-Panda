import { Metadata } from '@grpc/grpc-js';
import { RequestMetadata } from '../types/common';

/**
 * Create gRPC metadata from request metadata
 */
export function createMetadata(requestMetadata: RequestMetadata): Metadata {
    const metadata = new Metadata();

    metadata.set('request-id', requestMetadata.requestId);

    if (requestMetadata.userId) {
        metadata.set('user-id', requestMetadata.userId);
    }

    if (requestMetadata.userEmail) {
        metadata.set('user-email', requestMetadata.userEmail);
    }

    if (requestMetadata.userRoles && requestMetadata.userRoles.length > 0) {
        metadata.set('user-roles', JSON.stringify(requestMetadata.userRoles));
    }

    if (requestMetadata.sessionId) {
        metadata.set('session-id', requestMetadata.sessionId);
    }

    if (requestMetadata.ipAddress) {
        metadata.set('ip-address', requestMetadata.ipAddress);
    }

    if (requestMetadata.userAgent) {
        metadata.set('user-agent', requestMetadata.userAgent);
    }

    return metadata;
}

/**
 * Extract request metadata from gRPC metadata
 */
export function extractRequestMetadata(metadata: Metadata): RequestMetadata {
    const requestId = metadata.get('request-id')?.[0] as string || 'unknown';
    const userId = metadata.get('user-id')?.[0] as string;
    const userEmail = metadata.get('user-email')?.[0] as string;
    const userRolesStr = metadata.get('user-roles')?.[0] as string;
    const sessionId = metadata.get('session-id')?.[0] as string;
    const ipAddress = metadata.get('ip-address')?.[0] as string;
    const userAgent = metadata.get('user-agent')?.[0] as string;

    let userRoles: string[] = [];
    if (userRolesStr) {
        try {
            userRoles = JSON.parse(userRolesStr);
        } catch (error) {
            console.warn('Failed to parse user roles from metadata:', error);
        }
    }

    return {
        requestId,
        userId,
        userEmail,
        userRoles,
        sessionId,
        ipAddress,
        userAgent
    };
}

/**
 * Add authentication metadata
 */
export function addAuthMetadata(
    metadata: Metadata,
    token: string,
    tokenType: string = 'Bearer'
): void {
    metadata.set('authorization', `${tokenType} ${token}`);
}

/**
 * Add service metadata
 */
export function addServiceMetadata(
    metadata: Metadata,
    serviceName: string,
    serviceVersion: string
): void {
    metadata.set('service-name', serviceName);
    metadata.set('service-version', serviceVersion);
}

/**
 * Add tracing metadata
 */
export function addTracingMetadata(
    metadata: Metadata,
    traceId: string,
    spanId: string,
    parentSpanId?: string
): void {
    metadata.set('trace-id', traceId);
    metadata.set('span-id', spanId);

    if (parentSpanId) {
        metadata.set('parent-span-id', parentSpanId);
    }
}

/**
 * Add correlation metadata
 */
export function addCorrelationMetadata(
    metadata: Metadata,
    correlationId: string
): void {
    metadata.set('correlation-id', correlationId);
}

/**
 * Get metadata value safely
 */
export function getMetadataValue(
    metadata: Metadata,
    key: string,
    defaultValue?: string
): string | undefined {
    const values = metadata.get(key);
    return values && values.length > 0 ? values[0] as string : defaultValue;
}

/**
 * Check if metadata has key
 */
export function hasMetadataKey(metadata: Metadata, key: string): boolean {
    const values = metadata.get(key);
    return values && values.length > 0;
}

/**
 * Clone metadata
 */
export function cloneMetadata(metadata: Metadata): Metadata {
    const cloned = new Metadata();
    const map = metadata.getMap();

    for (const [key, value] of Object.entries(map)) {
        if (Array.isArray(value)) {
            value.forEach(v => cloned.add(key, v));
        } else {
            cloned.set(key, value);
        }
    }

    return cloned;
}

/**
 * Merge metadata objects
 */
export function mergeMetadata(...metadataObjects: Metadata[]): Metadata {
    const merged = new Metadata();

    for (const metadata of metadataObjects) {
        const map = metadata.getMap();

        for (const [key, value] of Object.entries(map)) {
            if (Array.isArray(value)) {
                value.forEach(v => merged.add(key, v));
            } else {
                merged.set(key, value);
            }
        }
    }

    return merged;
}

/**
 * Create metadata from HTTP headers
 */
export function createMetadataFromHeaders(headers: Record<string, string | string[]>): Metadata {
    const metadata = new Metadata();

    for (const [key, value] of Object.entries(headers)) {
        const normalizedKey = key.toLowerCase();

        if (Array.isArray(value)) {
            value.forEach(v => metadata.add(normalizedKey, v));
        } else {
            metadata.set(normalizedKey, value);
        }
    }

    return metadata;
}

/**
 * Convert metadata to HTTP headers
 */
export function metadataToHeaders(metadata: Metadata): Record<string, string> {
    const headers: Record<string, string> = {};
    const map = metadata.getMap();

    for (const [key, value] of Object.entries(map)) {
        if (Array.isArray(value)) {
            headers[key] = value.join(', ');
        } else {
            headers[key] = value.toString();
        }
    }

    return headers;
}