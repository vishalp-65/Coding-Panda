import {
    serviceManager,
    ServiceManager,
    UserServiceClient,
    ProblemServiceClient,
    ExecutionServiceClient,
    ContestServiceClient,
    AnalyticsServiceClient,
    NotificationServiceClient,
    AIAnalysisServiceClient
} from '@ai-platform/grpc-common';

// Service client configurations
const serviceConfigs = [
    {
        serviceName: 'UserService',
        clientConstructor: UserServiceClient,
        defaultHost: process.env.USER_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.USER_SERVICE_GRPC_PORT || '50051'),
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
    },
    {
        serviceName: 'ProblemService',
        clientConstructor: ProblemServiceClient,
        defaultHost: process.env.PROBLEM_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.PROBLEM_SERVICE_GRPC_PORT || '50052'),
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
    },
    {
        serviceName: 'ExecutionService',
        clientConstructor: ExecutionServiceClient,
        defaultHost: process.env.EXECUTION_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.EXECUTION_SERVICE_GRPC_PORT || '50053'),
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 60000 // Longer timeout for code execution
    },
    {
        serviceName: 'ContestService',
        clientConstructor: ContestServiceClient,
        defaultHost: process.env.CONTEST_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.CONTEST_SERVICE_GRPC_PORT || '50054'),
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
    },
    {
        serviceName: 'AnalyticsService',
        clientConstructor: AnalyticsServiceClient,
        defaultHost: process.env.ANALYTICS_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.ANALYTICS_SERVICE_GRPC_PORT || '50055'),
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
    },
    {
        serviceName: 'NotificationService',
        clientConstructor: NotificationServiceClient,
        defaultHost: process.env.NOTIFICATION_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.NOTIFICATION_SERVICE_GRPC_PORT || '50056'),
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
    },
    {
        serviceName: 'AIAnalysisService',
        clientConstructor: AIAnalysisServiceClient,
        defaultHost: process.env.AI_SERVICE_GRPC_HOST || 'localhost',
        defaultPort: parseInt(process.env.AI_SERVICE_GRPC_PORT || '50057'),
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 120000 // Longer timeout for AI analysis
    }
];

// Initialize service manager with all service configurations
export function initializeGrpcClients(): void {
    console.log('Initializing gRPC clients...');

    for (const config of serviceConfigs) {
        serviceManager.registerService(config);
        console.log(`Registered gRPC client for ${config.serviceName}`);
    }

    // Set up event listeners
    serviceManager.on('clientCreated', (serviceName: string, serviceInfo: any) => {
        console.log(`gRPC client created for ${serviceName} at ${serviceInfo.host}:${serviceInfo.port}`);
    });

    serviceManager.on('clientClosed', (serviceName: string) => {
        console.log(`gRPC client closed for ${serviceName}`);
    });

    console.log('gRPC clients initialized successfully');
}

// Utility functions to get specific service clients
export function getUserServiceClient(): UserServiceClient | null {
    return serviceManager.getClient<UserServiceClient>('UserService');
}

export function getProblemServiceClient(): ProblemServiceClient | null {
    return serviceManager.getClient<ProblemServiceClient>('ProblemService');
}

export function getExecutionServiceClient(): ExecutionServiceClient | null {
    return serviceManager.getClient<ExecutionServiceClient>('ExecutionService');
}

export function getContestServiceClient(): ContestServiceClient | null {
    return serviceManager.getClient<ContestServiceClient>('ContestService');
}

export function getAnalyticsServiceClient(): AnalyticsServiceClient | null {
    return serviceManager.getClient<AnalyticsServiceClient>('AnalyticsService');
}

export function getNotificationServiceClient(): NotificationServiceClient | null {
    return serviceManager.getClient<NotificationServiceClient>('NotificationService');
}

export function getAIAnalysisServiceClient(): AIAnalysisServiceClient | null {
    return serviceManager.getClient<AIAnalysisServiceClient>('AIAnalysisService');
}

// Utility function to make resilient calls
export async function makeResilientCall<T>(
    serviceName: string,
    methodName: string,
    request: any,
    metadata?: any
): Promise<T> {
    return serviceManager.makeResilientCall<T>(serviceName, methodName, request, metadata);
}

// Health check for all services
export async function checkAllServicesHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};

    for (const config of serviceConfigs) {
        try {
            const client = serviceManager.getClient(config.serviceName);
            if (client) {
                // This would need to be implemented based on the actual client interface
                healthStatus[config.serviceName] = true;
            } else {
                healthStatus[config.serviceName] = false;
            }
        } catch (error) {
            console.error(`Health check failed for ${config.serviceName}:`, error);
            healthStatus[config.serviceName] = false;
        }
    }

    return healthStatus;
}

// Cleanup function
export function cleanupGrpcClients(): void {
    console.log('Cleaning up gRPC clients...');
    serviceManager.closeAllClients();
    serviceManager.destroy();
    console.log('gRPC clients cleaned up');
}

// Export the service manager for advanced usage
export { serviceManager };