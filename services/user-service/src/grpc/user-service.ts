import {
    GrpcServer,
    createHealthCheckImplementation,
    extractMetadata,
    createBaseResponse,
    validateRequiredFields,
    createPaginationResponse,
    handleAsyncGrpcCall,
    createNotFoundError,
    createAlreadyExistsError,
    createValidationErrorResponse
} from '@ai-platform/grpc-common';
import { UserServiceService } from '@ai-platform/grpc-common';
import { UserController } from '../controllers';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import { config } from '../config/env';

export class UserGrpcService {
    private server: GrpcServer;
    private userController: UserController;
    private userService: UserService;
    private authService: AuthService;

    constructor() {
        this.server = new GrpcServer({
            port: config.grpcPort || 50051,
            options: {
                'grpc.max_receive_message_length': 4 * 1024 * 1024, // 4MB
                'grpc.max_send_message_length': 4 * 1024 * 1024, // 4MB
            }
        });

        this.userController = new UserController();
        this.userService = new UserService();
        this.authService = new AuthService();

        this.setupService();
    }

    private setupService(): void {
        const implementation = {
            // Health check
            healthCheck: this.healthCheck.bind(this),

            // User management
            createUser: this.createUser.bind(this),
            getUser: this.getUser.bind(this),
            getUserByEmail: this.getUserByEmail.bind(this),
            getUserByUsername: this.getUserByUsername.bind(this),
            updateUser: this.updateUser.bind(this),
            deleteUser: this.deleteUser.bind(this),
            listUsers: this.listUsers.bind(this),

            // Authentication
            validateToken: this.validateToken.bind(this),
            refreshToken: this.refreshToken.bind(this),

            // User preferences
            updatePreferences: this.updatePreferences.bind(this),
            getPreferences: this.getPreferences.bind(this),

            // User roles
            updateUserRoles: this.updateUserRoles.bind(this),

            // Availability checks
            checkEmailAvailability: this.checkEmailAvailability.bind(this),
            checkUsernameAvailability: this.checkUsernameAvailability.bind(this),
        };

        this.server.addService(UserServiceService, implementation, 'UserService');
    }

    // Health check implementation
    private healthCheck(call: any, callback: any): void {
        const health = this.server.getHealth();
        callback(null, {
            service: health.service,
            status: health.status,
            version: health.version,
            timestamp: health.timestamp,
            uptime: health.uptime
        });
    }

    // Create user implementation
    private async createUser(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            // Validate required fields
            const validation = validateRequiredFields(request, [
                'username', 'email', 'password', 'acceptTerms'
            ]);

            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            // Check if user already exists
            const existingUser = await this.userService.findByEmail(request.email);
            if (existingUser) {
                return callback(null, {
                    base: createBaseResponse(false, 'User already exists with this email', [], {
                        code: 'USER_ALREADY_EXISTS',
                        message: 'User already exists with this email'
                    })
                });
            }

            // Create user
            const userData = {
                username: request.username,
                email: request.email,
                password: request.password,
                firstName: request.firstName,
                lastName: request.lastName,
                acceptTerms: request.acceptTerms
            };

            const user = await this.userService.createUser(userData);

            callback(null, {
                base: createBaseResponse(true, 'User created successfully'),
                user: this.mapUserToProto(user)
            });

        } catch (error) {
            console.error('Error creating user:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to create user', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get user implementation
    private async getUser(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const user = await this.userService.findById(request.userId);
            if (!user) {
                return callback(null, {
                    base: createBaseResponse(false, 'User not found', [], {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true),
                user: this.mapUserToProto(user)
            });

        } catch (error) {
            console.error('Error getting user:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get user', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get user by email implementation
    private async getUserByEmail(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['email']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const user = await this.userService.findByEmail(request.email);
            if (!user) {
                return callback(null, {
                    base: createBaseResponse(false, 'User not found', [], {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true),
                user: this.mapUserToProto(user)
            });

        } catch (error) {
            console.error('Error getting user by email:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get user', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get user by username implementation
    private async getUserByUsername(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['username']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const user = await this.userService.findByUsername(request.username);
            if (!user) {
                return callback(null, {
                    base: createBaseResponse(false, 'User not found', [], {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true),
                user: this.mapUserToProto(user)
            });

        } catch (error) {
            console.error('Error getting user by username:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get user', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Update user implementation
    private async updateUser(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const updateData: any = {};
            if (request.firstName) updateData.firstName = request.firstName;
            if (request.lastName) updateData.lastName = request.lastName;
            if (request.avatar) updateData.avatar = request.avatar;

            const user = await this.userService.updateUser(request.userId, updateData);
            if (!user) {
                return callback(null, {
                    base: createBaseResponse(false, 'User not found', [], {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true, 'User updated successfully'),
                user: this.mapUserToProto(user)
            });

        } catch (error) {
            console.error('Error updating user:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to update user', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Delete user implementation
    private async deleteUser(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const deleted = await this.userService.deleteUser(request.userId);
            if (!deleted) {
                return callback(null, {
                    base: createBaseResponse(false, 'User not found', [], {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true, 'User deleted successfully')
            });

        } catch (error) {
            console.error('Error deleting user:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to delete user', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // List users implementation
    private async listUsers(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const pagination = request.pagination || {};
            const limit = pagination.limit || 20;
            const offset = pagination.offset || 0;

            const filters: any = {};
            if (request.search) filters.search = request.search;
            if (request.roles && request.roles.length > 0) filters.roles = request.roles;
            if (request.activeOnly) filters.isActive = true;

            const result = await this.userService.listUsers(filters, { limit, offset });

            callback(null, {
                base: createBaseResponse(true),
                users: result.users.map(user => this.mapUserToProto(user)),
                pagination: createPaginationResponse(result.total, limit, offset)
            });

        } catch (error) {
            console.error('Error listing users:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to list users', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Validate token implementation
    private async validateToken(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;

            const validation = validateRequiredFields(request, ['token']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const tokenData = await this.authService.validateToken(request.token);

            if (!tokenData.valid) {
                return callback(null, {
                    base: createBaseResponse(true),
                    valid: false
                });
            }

            const user = await this.userService.findById(tokenData.userId!);

            callback(null, {
                base: createBaseResponse(true),
                valid: true,
                user: user ? this.mapUserToProto(user) : undefined,
                expiresAt: tokenData.expiresAt
            });

        } catch (error) {
            console.error('Error validating token:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to validate token', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Refresh token implementation
    private async refreshToken(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;

            const validation = validateRequiredFields(request, ['refreshToken']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const tokens = await this.authService.refreshToken(request.refreshToken);

            callback(null, {
                base: createBaseResponse(true, 'Token refreshed successfully'),
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn
            });

        } catch (error) {
            console.error('Error refreshing token:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to refresh token', [], {
                    code: 'INVALID_REFRESH_TOKEN',
                    message: error instanceof Error ? error.message : 'Invalid refresh token'
                })
            });
        }
    }

    // Update preferences implementation
    private async updatePreferences(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId', 'preferences']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const preferences = await this.userService.updatePreferences(
                request.userId,
                this.mapPreferencesFromProto(request.preferences)
            );

            callback(null, {
                base: createBaseResponse(true, 'Preferences updated successfully'),
                preferences: this.mapPreferencesToProto(preferences)
            });

        } catch (error) {
            console.error('Error updating preferences:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to update preferences', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get preferences implementation
    private async getPreferences(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const preferences = await this.userService.getPreferences(request.userId);
            if (!preferences) {
                return callback(null, {
                    base: createBaseResponse(false, 'User preferences not found', [], {
                        code: 'PREFERENCES_NOT_FOUND',
                        message: 'User preferences not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true),
                preferences: this.mapPreferencesToProto(preferences)
            });

        } catch (error) {
            console.error('Error getting preferences:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get preferences', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Update user roles implementation
    private async updateUserRoles(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId', 'roles']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const user = await this.userService.updateUserRoles(request.userId, request.roles);
            if (!user) {
                return callback(null, {
                    base: createBaseResponse(false, 'User not found', [], {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    })
                });
            }

            callback(null, {
                base: createBaseResponse(true, 'User roles updated successfully'),
                user: this.mapUserToProto(user)
            });

        } catch (error) {
            console.error('Error updating user roles:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to update user roles', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Check email availability implementation
    private async checkEmailAvailability(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;

            const validation = validateRequiredFields(request, ['email']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const user = await this.userService.findByEmail(request.email);
            const available = !user;

            callback(null, {
                base: createBaseResponse(true),
                available
            });

        } catch (error) {
            console.error('Error checking email availability:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to check email availability', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Check username availability implementation
    private async checkUsernameAvailability(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;

            const validation = validateRequiredFields(request, ['username']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const user = await this.userService.findByUsername(request.username);
            const available = !user;

            callback(null, {
                base: createBaseResponse(true),
                available
            });

        } catch (error) {
            console.error('Error checking username availability:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to check username availability', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Helper method to map user to protobuf format
    private mapUserToProto(user: any): any {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            avatar: user.avatar || '',
            roles: user.roles || ['user'],
            preferences: user.preferences ? this.mapPreferencesToProto(user.preferences) : undefined,
            createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
            isActive: user.isActive !== undefined ? user.isActive : true,
            isVerified: user.isVerified !== undefined ? user.isVerified : false
        };
    }

    // Helper method to map preferences to protobuf format
    private mapPreferencesToProto(preferences: any): any {
        return {
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
        };
    }

    // Helper method to map preferences from protobuf format
    private mapPreferencesFromProto(preferences: any): any {
        return {
            theme: preferences.theme,
            language: preferences.language,
            notifications: {
                email: preferences.notifications?.email,
                push: preferences.notifications?.push,
                inApp: preferences.notifications?.inApp,
                contests: preferences.notifications?.contests,
                achievements: preferences.notifications?.achievements,
                systemUpdates: preferences.notifications?.systemUpdates
            },
            privacy: {
                profileVisibility: preferences.privacy?.profileVisibility,
                showEmail: preferences.privacy?.showEmail,
                showRealName: preferences.privacy?.showRealName,
                allowAnalytics: preferences.privacy?.allowAnalytics
            }
        };
    }

    // Start the gRPC server
    async start(): Promise<void> {
        await this.server.start();
        console.log(`User gRPC service started on port ${config.grpcPort || 50051}`);
    }

    // Stop the gRPC server
    async stop(): Promise<void> {
        await this.server.stop();
        console.log('User gRPC service stopped');
    }
}