import { RedisManager } from '../config/redis';
import { NotificationPreferences, NotificationType, NotificationChannel, UpdatePreferencesRequest } from '../types';

export class PreferencesService {
    private static instance: PreferencesService;
    private redis: RedisManager;

    private constructor() {
        this.redis = RedisManager.getInstance();
    }

    public static getInstance(): PreferencesService {
        if (!PreferencesService.instance) {
            PreferencesService.instance = new PreferencesService();
        }
        return PreferencesService.instance;
    }

    public async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
        try {
            const preferences = await this.redis.getUserPreferences(userId);
            return preferences ? this.validateAndNormalizePreferences(preferences) : null;
        } catch (error) {
            console.error(`Error fetching preferences for user ${userId}:`, error);
            return null;
        }
    }

    public async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
        const defaultPreferences: NotificationPreferences = {
            userId,
            emailNotifications: true,
            inAppNotifications: true,
            digestEmail: true,
            digestFrequency: 'daily',
            notificationTypes: this.getDefaultNotificationTypePreferences(),
            updatedAt: new Date()
        };

        await this.redis.storeUserPreferences(userId, defaultPreferences);
        return defaultPreferences;
    }

    public async updateUserPreferences(userId: string, updates: UpdatePreferencesRequest): Promise<NotificationPreferences> {
        let preferences = await this.getUserPreferences(userId);

        if (!preferences) {
            preferences = await this.createDefaultPreferences(userId);
        }

        // Apply updates
        const updatedPreferences: NotificationPreferences = {
            ...preferences,
            ...updates,
            updatedAt: new Date()
        } as NotificationPreferences;

        // Merge notification type preferences if provided
        if (updates.notificationTypes) {
            updatedPreferences.notificationTypes = {
                ...preferences.notificationTypes,
                ...updates.notificationTypes
            } as NotificationPreferences['notificationTypes'];
        }

        // Validate the updated preferences
        const validatedPreferences = this.validateAndNormalizePreferences(updatedPreferences);

        await this.redis.storeUserPreferences(userId, validatedPreferences);
        return validatedPreferences;
    }

    public async updateNotificationTypePreference(
        userId: string,
        notificationType: NotificationType,
        enabled: boolean,
        channels?: NotificationChannel[]
    ): Promise<void> {
        const preferences = await this.getUserPreferences(userId) || await this.createDefaultPreferences(userId);

        preferences.notificationTypes[notificationType] = {
            enabled,
            channels: channels || [NotificationChannel.BOTH]
        };

        preferences.updatedAt = new Date();

        await this.redis.storeUserPreferences(userId, preferences);
    }

    public async setQuietHours(
        userId: string,
        start: string,
        end: string,
        timezone: string
    ): Promise<void> {
        const preferences = await this.getUserPreferences(userId) || await this.createDefaultPreferences(userId);

        // Validate time format (HH:mm)
        if (!this.isValidTimeFormat(start) || !this.isValidTimeFormat(end)) {
            throw new Error('Invalid time format. Use HH:mm format (e.g., 22:00)');
        }

        preferences.quietHours = {
            start,
            end,
            timezone
        };

        preferences.updatedAt = new Date();

        await this.redis.storeUserPreferences(userId, preferences);
    }

    public async removeQuietHours(userId: string): Promise<void> {
        const preferences = await this.getUserPreferences(userId);
        if (!preferences) return;

        delete preferences.quietHours;
        preferences.updatedAt = new Date();

        await this.redis.storeUserPreferences(userId, preferences);
    }

    public async enableAllNotifications(userId: string): Promise<void> {
        const preferences = await this.getUserPreferences(userId) || await this.createDefaultPreferences(userId);

        preferences.emailNotifications = true;
        preferences.inAppNotifications = true;

        // Enable all notification types
        Object.keys(preferences.notificationTypes).forEach(type => {
            preferences.notificationTypes[type as NotificationType] = {
                enabled: true,
                channels: [NotificationChannel.BOTH]
            };
        });

        preferences.updatedAt = new Date();

        await this.redis.storeUserPreferences(userId, preferences);
    }

    public async disableAllNotifications(userId: string): Promise<void> {
        const preferences = await this.getUserPreferences(userId) || await this.createDefaultPreferences(userId);

        preferences.emailNotifications = false;
        preferences.inAppNotifications = false;
        preferences.digestEmail = false;

        // Disable all notification types
        Object.keys(preferences.notificationTypes).forEach(type => {
            preferences.notificationTypes[type as NotificationType] = {
                enabled: false,
                channels: []
            };
        });

        preferences.updatedAt = new Date();

        await this.redis.storeUserPreferences(userId, preferences);
    }

    public async getPreferencesForMultipleUsers(userIds: string[]): Promise<Map<string, NotificationPreferences | null>> {
        const preferencesMap = new Map<string, NotificationPreferences | null>();

        for (const userId of userIds) {
            const preferences = await this.getUserPreferences(userId);
            preferencesMap.set(userId, preferences);
        }

        return preferencesMap;
    }

    public async exportUserPreferences(userId: string): Promise<NotificationPreferences | null> {
        return await this.getUserPreferences(userId);
    }

    public async importUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
        const validatedPreferences = this.validateAndNormalizePreferences({
            ...preferences,
            userId,
            updatedAt: new Date()
        });

        await this.redis.storeUserPreferences(userId, validatedPreferences);
    }

    public async deleteUserPreferences(userId: string): Promise<void> {
        // This would delete the preferences from Redis
        const key = `user:${userId}:preferences`;
        await this.redis.getClient().del(key);
    }

    private getDefaultNotificationTypePreferences(): NotificationPreferences['notificationTypes'] {
        const defaults: NotificationPreferences['notificationTypes'] = {} as any;

        // Set defaults for each notification type
        Object.values(NotificationType).forEach(type => {
            switch (type) {
                case NotificationType.SYSTEM:
                case NotificationType.CONTEST_START:
                case NotificationType.CONTEST_END:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.BOTH]
                    };
                    break;
                case NotificationType.ACHIEVEMENT:
                case NotificationType.MILESTONE:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.BOTH]
                    };
                    break;
                case NotificationType.SUBMISSION_RESULT:
                case NotificationType.RANKING_UPDATE:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.IN_APP]
                    };
                    break;
                case NotificationType.COLLABORATION_INVITE:
                case NotificationType.INTERVIEW_REMINDER:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.BOTH]
                    };
                    break;
                case NotificationType.LEARNING_RECOMMENDATION:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.IN_APP]
                    };
                    break;
                case NotificationType.CONTEST_REMINDER:
                case NotificationType.CONTEST_REGISTRATION:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.EMAIL]
                    };
                    break;
                default:
                    defaults[type] = {
                        enabled: true,
                        channels: [NotificationChannel.IN_APP]
                    };
            }
        });

        return defaults;
    }

    private validateAndNormalizePreferences(preferences: NotificationPreferences): NotificationPreferences {
        // Ensure all required notification types are present
        const normalizedTypes = { ...this.getDefaultNotificationTypePreferences() };

        if (preferences.notificationTypes) {
            Object.keys(preferences.notificationTypes).forEach(type => {
                if (Object.values(NotificationType).includes(type as NotificationType)) {
                    normalizedTypes[type as NotificationType] = preferences.notificationTypes[type as NotificationType];
                }
            });
        }

        return {
            ...preferences,
            notificationTypes: normalizedTypes,
            digestFrequency: this.validateDigestFrequency(preferences.digestFrequency)
        };
    }

    private validateDigestFrequency(frequency: string): 'daily' | 'weekly' | 'never' {
        if (['daily', 'weekly', 'never'].includes(frequency)) {
            return frequency as 'daily' | 'weekly' | 'never';
        }
        return 'daily'; // Default fallback
    }

    private isValidTimeFormat(time: string): boolean {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    // Analytics and insights
    public async getPreferencesStats(): Promise<any> {
        // This would analyze preferences across all users
        // For now, return a placeholder
        return {
            totalUsers: 0,
            emailEnabled: 0,
            inAppEnabled: 0,
            digestEnabled: 0,
            mostPopularTypes: [],
            quietHoursUsage: 0
        };
    }

    public async getUsersWithDigestEnabled(frequency: 'daily' | 'weekly'): Promise<string[]> {
        // This would query all users with digest enabled for the given frequency
        // For now, return empty array
        return [];
    }

    public async getUsersWithNotificationTypeEnabled(type: NotificationType): Promise<string[]> {
        // This would query all users with the specific notification type enabled
        // For now, return empty array
        return [];
    }
}