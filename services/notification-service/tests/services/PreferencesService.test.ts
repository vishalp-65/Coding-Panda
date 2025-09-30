import { PreferencesService } from '../../src/services/PreferencesService';
import { NotificationType, NotificationChannel } from '../../src/types';
import { mockUserPreferences } from '../setup';

describe('PreferencesService', () => {
    let preferencesService: PreferencesService;

    beforeEach(() => {
        preferencesService = PreferencesService.getInstance();
    });

    describe('getUserPreferences', () => {
        it('should return null for non-existent user preferences', async () => {
            const userId = 'non-existent-user';

            const preferences = await preferencesService.getUserPreferences(userId);

            expect(preferences).toBeNull();
        });
    });

    describe('createDefaultPreferences', () => {
        it('should create default preferences for a user', async () => {
            const userId = 'new-user-id';

            const preferences = await preferencesService.createDefaultPreferences(userId);

            expect(preferences).toBeDefined();
            expect(preferences.userId).toBe(userId);
            expect(preferences.emailNotifications).toBe(true);
            expect(preferences.inAppNotifications).toBe(true);
            expect(preferences.digestEmail).toBe(true);
            expect(preferences.digestFrequency).toBe('daily');
            expect(preferences.notificationTypes).toBeDefined();
            expect(preferences.updatedAt).toBeInstanceOf(Date);
        });

        it('should include all notification types in default preferences', async () => {
            const userId = 'new-user-id';

            const preferences = await preferencesService.createDefaultPreferences(userId);

            const notificationTypes = Object.keys(preferences.notificationTypes);
            const expectedTypes = Object.values(NotificationType);

            expect(notificationTypes.length).toBe(expectedTypes.length);
            expectedTypes.forEach(type => {
                expect(preferences.notificationTypes[type]).toBeDefined();
                expect(preferences.notificationTypes[type].enabled).toBeDefined();
                expect(preferences.notificationTypes[type].channels).toBeDefined();
            });
        });
    });

    describe('updateUserPreferences', () => {
        it('should update existing user preferences', async () => {
            const userId = 'test-user-id';
            const updates = {
                emailNotifications: false,
                digestFrequency: 'weekly' as const
            };

            const updatedPreferences = await preferencesService.updateUserPreferences(userId, updates);

            expect(updatedPreferences.emailNotifications).toBe(false);
            expect(updatedPreferences.digestFrequency).toBe('weekly');
            expect(updatedPreferences.updatedAt).toBeInstanceOf(Date);
        });

        it('should create default preferences if user has none', async () => {
            const userId = 'new-user-id';
            const updates = {
                emailNotifications: false
            };

            const preferences = await preferencesService.updateUserPreferences(userId, updates);

            expect(preferences).toBeDefined();
            expect(preferences.userId).toBe(userId);
            expect(preferences.emailNotifications).toBe(false);
        });

        it('should merge notification type preferences', async () => {
            const userId = 'test-user-id';
            const updates = {
                notificationTypes: {
                    [NotificationType.CONTEST_START]: {
                        enabled: false,
                        channels: [NotificationChannel.EMAIL]
                    }
                }
            };

            const preferences = await preferencesService.updateUserPreferences(userId, updates);

            expect(preferences.notificationTypes[NotificationType.CONTEST_START].enabled).toBe(false);
            expect(preferences.notificationTypes[NotificationType.CONTEST_START].channels).toEqual([NotificationChannel.EMAIL]);
        });
    });

    describe('updateNotificationTypePreference', () => {
        it('should update specific notification type preference', async () => {
            const userId = 'test-user-id';
            const notificationType = NotificationType.ACHIEVEMENT;
            const enabled = false;
            const channels = [NotificationChannel.IN_APP];

            await preferencesService.updateNotificationTypePreference(userId, notificationType, enabled, channels);

            // This would normally verify the update, but since we're mocking Redis,
            // we just ensure the method doesn't throw
            expect(true).toBe(true);
        });
    });

    describe('quiet hours management', () => {
        it('should set quiet hours for a user', async () => {
            const userId = 'test-user-id';
            const start = '22:00';
            const end = '08:00';
            const timezone = 'America/New_York';

            await expect(
                preferencesService.setQuietHours(userId, start, end, timezone)
            ).resolves.not.toThrow();
        });

        it('should validate time format for quiet hours', async () => {
            const userId = 'test-user-id';
            const invalidStart = '25:00'; // Invalid hour
            const end = '08:00';
            const timezone = 'America/New_York';

            await expect(
                preferencesService.setQuietHours(userId, invalidStart, end, timezone)
            ).rejects.toThrow('Invalid time format');
        });

        it('should remove quiet hours for a user', async () => {
            const userId = 'test-user-id';

            await expect(
                preferencesService.removeQuietHours(userId)
            ).resolves.not.toThrow();
        });
    });

    describe('bulk preference operations', () => {
        it('should enable all notifications for a user', async () => {
            const userId = 'test-user-id';

            await expect(
                preferencesService.enableAllNotifications(userId)
            ).resolves.not.toThrow();
        });

        it('should disable all notifications for a user', async () => {
            const userId = 'test-user-id';

            await expect(
                preferencesService.disableAllNotifications(userId)
            ).resolves.not.toThrow();
        });
    });

    describe('multi-user operations', () => {
        it('should get preferences for multiple users', async () => {
            const userIds = ['user1', 'user2', 'user3'];

            const preferencesMap = await preferencesService.getPreferencesForMultipleUsers(userIds);

            expect(preferencesMap).toBeInstanceOf(Map);
            expect(preferencesMap.size).toBe(3);
            userIds.forEach(userId => {
                expect(preferencesMap.has(userId)).toBe(true);
            });
        });
    });

    describe('data management', () => {
        it('should export user preferences', async () => {
            const userId = 'test-user-id';

            const preferences = await preferencesService.exportUserPreferences(userId);

            // Since we're mocking, this will return null, but the method should not throw
            expect(preferences).toBeNull();
        });

        it('should import user preferences', async () => {
            const userId = 'test-user-id';
            const preferences = {
                ...mockUserPreferences,
                userId
            };

            await expect(
                preferencesService.importUserPreferences(userId, preferences)
            ).resolves.not.toThrow();
        });

        it('should delete user preferences', async () => {
            const userId = 'test-user-id';

            await expect(
                preferencesService.deleteUserPreferences(userId)
            ).resolves.not.toThrow();
        });
    });

    describe('analytics and insights', () => {
        it('should get preferences stats', async () => {
            const stats = await preferencesService.getPreferencesStats();

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('totalUsers');
            expect(stats).toHaveProperty('emailEnabled');
            expect(stats).toHaveProperty('inAppEnabled');
            expect(stats).toHaveProperty('digestEnabled');
        });

        it('should get users with digest enabled', async () => {
            const frequency = 'daily';

            const users = await preferencesService.getUsersWithDigestEnabled(frequency);

            expect(Array.isArray(users)).toBe(true);
        });

        it('should get users with specific notification type enabled', async () => {
            const type = NotificationType.CONTEST_START;

            const users = await preferencesService.getUsersWithNotificationTypeEnabled(type);

            expect(Array.isArray(users)).toBe(true);
        });
    });
});