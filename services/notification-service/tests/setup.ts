import { RedisManager } from '../src/config/redis';

// Mock Redis for tests
jest.mock('../src/config/redis', () => {
    const mockRedisClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        hSet: jest.fn().mockResolvedValue(undefined),
        hGetAll: jest.fn().mockResolvedValue({}),
        hGet: jest.fn().mockResolvedValue(null),
        zAdd: jest.fn().mockResolvedValue(undefined),
        zRevRange: jest.fn().mockResolvedValue([]),
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        expire: jest.fn().mockResolvedValue(1),
        expireAt: jest.fn().mockResolvedValue(1),
        lPush: jest.fn().mockResolvedValue(1),
        brPop: jest.fn().mockResolvedValue(null)
    };

    return {
        RedisManager: {
            getInstance: jest.fn(() => ({
                connect: mockRedisClient.connect,
                disconnect: mockRedisClient.disconnect,
                getClient: jest.fn(() => mockRedisClient),
                getSubscriber: jest.fn(() => mockRedisClient),
                getPublisher: jest.fn(() => mockRedisClient),
                storeNotification: jest.fn().mockResolvedValue(undefined),
                getNotification: jest.fn().mockResolvedValue(null),
                getUserNotifications: jest.fn().mockResolvedValue([]),
                markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
                getUnreadCount: jest.fn().mockResolvedValue(0),
                storeAnalytics: jest.fn().mockResolvedValue(undefined),
                storeUserPreferences: jest.fn().mockResolvedValue(undefined),
                getUserPreferences: jest.fn().mockResolvedValue(null),
                addToQueue: jest.fn().mockResolvedValue(undefined),
                getFromQueue: jest.fn().mockResolvedValue(null),
                cleanupExpiredNotifications: jest.fn().mockResolvedValue(0)
            }))
        }
    };
});

// Mock Bull Queue
jest.mock('bull', () => {
    return jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        process: jest.fn(),
        on: jest.fn(),
        getJobCounts: jest.fn().mockResolvedValue({
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0
        }),
        pause: jest.fn().mockResolvedValue(undefined),
        resume: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
    }));
});

// Mock nodemailer
jest.mock('nodemailer', () => ({
    createTransporter: jest.fn(() => ({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' })
    }))
}));

// Mock axios for external service calls
jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ data: { email: 'test@example.com', username: 'testuser' } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } })
}));

// Global test setup
beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'testpass';
});

afterAll(async () => {
    // Cleanup after all tests
});

beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

export const mockNotificationData = {
    id: 'test-notification-id',
    userId: 'test-user-id',
    type: 'contest_start',
    channel: 'both',
    priority: 'high',
    title: 'Test Notification',
    message: 'This is a test notification',
    data: { testData: 'value' },
    read: false,
    createdAt: new Date(),
    templateId: 'test-template'
};

import { NotificationChannel } from '../src/types';

export const mockUserPreferences = {
    userId: 'test-user-id',
    emailNotifications: true,
    inAppNotifications: true,
    digestEmail: true,
    digestFrequency: 'daily' as const,
    notificationTypes: {
        contest_start: { enabled: true, channels: [NotificationChannel.BOTH] },
        contest_end: { enabled: true, channels: [NotificationChannel.BOTH] },
        contest_reminder: { enabled: true, channels: [NotificationChannel.EMAIL] },
        contest_registration: { enabled: true, channels: [NotificationChannel.EMAIL] },
        submission_result: { enabled: true, channels: [NotificationChannel.IN_APP] },
        achievement: { enabled: true, channels: [NotificationChannel.BOTH] },
        milestone: { enabled: true, channels: [NotificationChannel.BOTH] },
        collaboration_invite: { enabled: true, channels: [NotificationChannel.BOTH] },
        system: { enabled: true, channels: [NotificationChannel.BOTH] },
        ranking_update: { enabled: true, channels: [NotificationChannel.IN_APP] },
        digest_email: { enabled: true, channels: [NotificationChannel.EMAIL] },
        learning_recommendation: { enabled: true, channels: [NotificationChannel.IN_APP] },
        interview_reminder: { enabled: true, channels: [NotificationChannel.BOTH] }
    },
    updatedAt: new Date()
};