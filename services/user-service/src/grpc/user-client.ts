import {
    GrpcClient,
    createGrpcClient,
    checkServiceHealth,
    RequestMetadata
} from '@ai-platform/grpc-common';
import { UserServiceClient } from '@ai-platform/grpc-common';
import { config } from '../config/env';

export class UserGrpcClient {
    private client: UserServiceClient;
    private grpcClient: GrpcClient;

    constructor(host: string = 'localhost', port: number = 50051) {
        this.client = createGrpcClient(UserServiceClient, {
            host,
            port,
            options: {
                'grpc.max_receive_message_length': 4 * 1024 * 1024,
                'grpc.max_send_message_length': 4 * 1024 * 1024,
            }
        });

        this.grpcClient = new GrpcClient(UserServiceClient, { host, port });
    }

    /**
     * Check if the service is healthy
     */
    async isHealthy(): Promise<boolean> {
        return checkServiceHealth(this.client);
    }

    /**
     * Create a new user
     */
    async createUser(
        userData: {
            username: string;
            email: string;
            password: string;
            firstName?: string;
            lastName?: string;
            acceptTerms: boolean;
        },
        metadata?: Partial<RequestMetadata>
    ) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            username: userData.username,
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            acceptTerms: userData.acceptTerms
        };

        return this.grpcClient.makeUnaryCall(
            this.client.createUser.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Get user by ID
     */
    async getUser(userId: string, metadata?: Partial<RequestMetadata>) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            userId
        };

        return this.grpcClient.makeUnaryCall(
            this.client.getUser.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string, metadata?: Partial<RequestMetadata>) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            email
        };

        return this.grpcClient.makeUnaryCall(
            this.client.getUserByEmail.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username: string, metadata?: Partial<RequestMetadata>) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            username
        };

        return this.grpcClient.makeUnaryCall(
            this.client.getUserByUsername.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Update user
     */
    async updateUser(
        userId: string,
        updateData: {
            firstName?: string;
            lastName?: string;
            avatar?: string;
        },
        metadata?: Partial<RequestMetadata>
    ) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            userId,
            firstName: updateData.firstName || '',
            lastName: updateData.lastName || '',
            avatar: updateData.avatar || ''
        };

        return this.grpcClient.makeUnaryCall(
            this.client.updateUser.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Delete user
     */
    async deleteUser(userId: string, metadata?: Partial<RequestMetadata>) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            userId
        };

        return this.grpcClient.makeUnaryCall(
            this.client.deleteUser.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * List users with pagination and filters
     */
    async listUsers(
        options: {
            limit?: number;
            offset?: number;
            search?: string;
            roles?: string[];
            activeOnly?: boolean;
        } = {},
        metadata?: Partial<RequestMetadata>
    ) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            pagination: {
                limit: options.limit || 20,
                offset: options.offset || 0,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            },
            search: options.search || '',
            roles: options.roles || [],
            activeOnly: options.activeOnly || false
        };

        return this.grpcClient.makeUnaryCall(
            this.client.listUsers.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Validate JWT token
     */
    async validateToken(token: string) {
        const request = { token };

        return this.grpcClient.makeUnaryCall(
            this.client.validateToken.bind(this.client),
            request
        );
    }

    /**
     * Refresh JWT token
     */
    async refreshToken(refreshToken: string) {
        const request = { refreshToken };

        return this.grpcClient.makeUnaryCall(
            this.client.refreshToken.bind(this.client),
            request
        );
    }

    /**
     * Update user preferences
     */
    async updatePreferences(
        userId: string,
        preferences: {
            theme?: string;
            language?: string;
            notifications?: {
                email?: boolean;
                push?: boolean;
                inApp?: boolean;
                contests?: boolean;
                achievements?: boolean;
                systemUpdates?: boolean;
            };
            privacy?: {
                profileVisibility?: string;
                showEmail?: boolean;
                showRealName?: boolean;
                allowAnalytics?: boolean;
            };
        },
        metadata?: Partial<RequestMetadata>
    ) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            userId,
            preferences: {
                theme: preferences.theme || 'auto',
                language: preferences.language || 'en',
                notifications: {
                    email: preferences.notifications?.email !== undefined ? preferences.notifications.email : true,
                    push: preferences.notifications?.push !== undefined ? preferences.notifications.push : true,
                    inApp: preferences.notifications?.inApp !== undefined ? preferences.notifications.inApp : true,
                    contests: preferences.notifications?.contests !== undefined ? preferences.notifications.contests : true,
                    achievements: preferences.notifications?.achievements !== undefined ? preferences.notifications.achievements : true,
                    systemUpdates: preferences.notifications?.systemUpdates !== undefined ? preferences.notifications.systemUpdates : false
                },
                privacy: {
                    profileVisibility: preferences.privacy?.profileVisibility || 'public',
                    showEmail: preferences.privacy?.showEmail !== undefined ? preferences.privacy.showEmail : false,
                    showRealName: preferences.privacy?.showRealName !== undefined ? preferences.privacy.showRealName : false,
                    allowAnalytics: preferences.privacy?.allowAnalytics !== undefined ? preferences.privacy.allowAnalytics : true
                }
            }
        };

        return this.grpcClient.makeUnaryCall(
            this.client.updatePreferences.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Get user preferences
     */
    async getPreferences(userId: string, metadata?: Partial<RequestMetadata>) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            userId
        };

        return this.grpcClient.makeUnaryCall(
            this.client.getPreferences.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Update user roles
     */
    async updateUserRoles(
        userId: string,
        roles: string[],
        metadata?: Partial<RequestMetadata>
    ) {
        const request = {
            metadata: this.grpcClient.createRequestMetadata(metadata),
            userId,
            roles
        };

        return this.grpcClient.makeUnaryCall(
            this.client.updateUserRoles.bind(this.client),
            request,
            metadata
        );
    }

    /**
     * Check email availability
     */
    async checkEmailAvailability(email: string) {
        const request = { email };

        return this.grpcClient.makeUnaryCall(
            this.client.checkEmailAvailability.bind(this.client),
            request
        );
    }

    /**
     * Check username availability
     */
    async checkUsernameAvailability(username: string) {
        const request = { username };

        return this.grpcClient.makeUnaryCall(
            this.client.checkUsernameAvailability.bind(this.client),
            request
        );
    }

    /**
     * Close the client connection
     */
    close(): void {
        this.grpcClient.close();
    }

    /**
     * Wait for the client to be ready
     */
    async waitForReady(deadline?: Date): Promise<void> {
        return this.grpcClient.waitForReady(deadline);
    }
}

// Export a singleton instance for easy use
export const userGrpcClient = new UserGrpcClient(
    process.env.USER_SERVICE_GRPC_HOST || 'localhost',
    parseInt(process.env.USER_SERVICE_GRPC_PORT || '50051')
);