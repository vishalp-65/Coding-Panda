import { Router } from 'express';
import { NotificationService } from '../services/NotificationService';
import { PreferencesService } from '../services/PreferencesService';
import { AnalyticsService } from '../services/AnalyticsService';
import { EmailService } from '../services/EmailService';
import { QueueService } from '../services/QueueService';
import {
    CreateNotificationRequest,
    UpdatePreferencesRequest,
    NotificationType,
    NotificationChannel,
    NotificationPriority
} from '../types';
import Joi from 'joi';

const router = Router();

// Services
const notificationService = NotificationService.getInstance();
const preferencesService = PreferencesService.getInstance();
const analyticsService = AnalyticsService.getInstance();
const emailService = EmailService.getInstance();
const queueService = QueueService.getInstance();

// Validation schemas
const createNotificationSchema = Joi.object({
    userId: Joi.string().uuid().optional(),
    userIds: Joi.array().items(Joi.string().uuid()).optional(),
    type: Joi.string().valid(...Object.values(NotificationType)).required(),
    channel: Joi.string().valid(...Object.values(NotificationChannel)).required(),
    priority: Joi.string().valid(...Object.values(NotificationPriority)).required(),
    title: Joi.string().min(1).max(200).required(),
    message: Joi.string().min(1).max(1000).required(),
    data: Joi.object().optional(),
    templateId: Joi.string().optional(),
    scheduleAt: Joi.date().optional(),
    expiresAt: Joi.date().optional()
}).xor('userId', 'userIds');

const updatePreferencesSchema = Joi.object({
    emailNotifications: Joi.boolean().optional(),
    inAppNotifications: Joi.boolean().optional(),
    digestEmail: Joi.boolean().optional(),
    digestFrequency: Joi.string().valid('daily', 'weekly', 'never').optional(),
    notificationTypes: Joi.object().optional(),
    quietHours: Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        timezone: Joi.string().required()
    }).optional()
});

// Middleware for request validation
const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: any, res: any, next: any) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        next();
    };
};

// Middleware for user authentication (placeholder)
const authenticateUser = (req: any, res: any, next: any) => {
    // In a real implementation, this would verify JWT token
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
    }
    req.userId = userId;
    next();
};

// NOTIFICATION ROUTES

// Create notification
router.post('/', validateRequest(createNotificationSchema), async (req, res) => {
    try {
        const request: CreateNotificationRequest = req.body;
        const notificationIds = await notificationService.createNotification(request);

        res.status(201).json({
            success: true,
            notificationIds,
            message: `Created ${notificationIds.length} notification(s)`
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            error: 'Failed to create notification',
            details: error.message
        });
    }
});

// Get user notifications
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const notifications = await notificationService.getUserNotifications(userId, limit, offset);
        const unreadCount = await notificationService.getUnreadCount(userId);

        res.json({
            notifications,
            unreadCount,
            pagination: {
                limit,
                offset,
                hasMore: notifications.length === limit
            }
        });
    } catch (error) {
        console.error('Error fetching user notifications:', error);
        res.status(500).json({
            error: 'Failed to fetch notifications',
            details: error.message
        });
    }
});

// Get specific notification
router.get('/:notificationId', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await notificationService.getNotification(notificationId);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({
            error: 'Failed to fetch notification',
            details: error.message
        });
    }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateUser, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = (req as any).userId;

        await notificationService.markAsRead(notificationId, userId);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            error: 'Failed to mark notification as read',
            details: error.message
        });
    }
});

// Mark all notifications as read
router.patch('/user/:userId/read-all', async (req, res) => {
    try {
        const { userId } = req.params;
        await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            error: 'Failed to mark all notifications as read',
            details: error.message
        });
    }
});

// Get unread count
router.get('/user/:userId/unread-count', async (req, res) => {
    try {
        const { userId } = req.params;
        const unreadCount = await notificationService.getUnreadCount(userId);

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            error: 'Failed to fetch unread count',
            details: error.message
        });
    }
});

// PREFERENCES ROUTES

// Get user preferences
router.get('/preferences/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let preferences = await preferencesService.getUserPreferences(userId);

        if (!preferences) {
            preferences = await preferencesService.createDefaultPreferences(userId);
        }

        res.json(preferences);
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({
            error: 'Failed to fetch preferences',
            details: error.message
        });
    }
});

// Update user preferences
router.put('/preferences/:userId', validateRequest(updatePreferencesSchema), async (req, res) => {
    try {
        const { userId } = req.params;
        const updates: UpdatePreferencesRequest = req.body;

        const preferences = await preferencesService.updateUserPreferences(userId, updates);

        res.json({
            success: true,
            preferences,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            error: 'Failed to update preferences',
            details: error.message
        });
    }
});

// Enable all notifications
router.post('/preferences/:userId/enable-all', async (req, res) => {
    try {
        const { userId } = req.params;
        await preferencesService.enableAllNotifications(userId);

        res.json({
            success: true,
            message: 'All notifications enabled'
        });
    } catch (error) {
        console.error('Error enabling all notifications:', error);
        res.status(500).json({
            error: 'Failed to enable all notifications',
            details: error.message
        });
    }
});

// Disable all notifications
router.post('/preferences/:userId/disable-all', async (req, res) => {
    try {
        const { userId } = req.params;
        await preferencesService.disableAllNotifications(userId);

        res.json({
            success: true,
            message: 'All notifications disabled'
        });
    } catch (error) {
        console.error('Error disabling all notifications:', error);
        res.status(500).json({
            error: 'Failed to disable all notifications',
            details: error.message
        });
    }
});

// ANALYTICS ROUTES

// Get notification stats
router.get('/analytics/stats', async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const userId = req.query.userId as string;

        const stats = await analyticsService.getNotificationStats(startDate, endDate, userId);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({
            error: 'Failed to fetch notification stats',
            details: error.message
        });
    }
});

// Get user engagement stats
router.get('/analytics/engagement/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const days = parseInt(req.query.days as string) || 30;

        const stats = await analyticsService.getUserEngagementStats(userId, days);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching user engagement stats:', error);
        res.status(500).json({
            error: 'Failed to fetch user engagement stats',
            details: error.message
        });
    }
});

// Get channel performance
router.get('/analytics/channels', async (req, res) => {
    try {
        const performance = await analyticsService.getChannelPerformance();
        res.json(performance);
    } catch (error) {
        console.error('Error fetching channel performance:', error);
        res.status(500).json({
            error: 'Failed to fetch channel performance',
            details: error.message
        });
    }
});

// Generate analytics report
router.post('/analytics/report', async (req, res) => {
    try {
        const { startDate, endDate, includeUserBreakdown } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: 'startDate and endDate are required'
            });
        }

        const report = await analyticsService.generateAnalyticsReport(
            new Date(startDate),
            new Date(endDate),
            includeUserBreakdown
        );

        res.json(report);
    } catch (error) {
        console.error('Error generating analytics report:', error);
        res.status(500).json({
            error: 'Failed to generate analytics report',
            details: error.message
        });
    }
});

// EMAIL TEMPLATE ROUTES

// Get all email templates
router.get('/templates', async (req, res) => {
    try {
        const templates = emailService.getAllTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({
            error: 'Failed to fetch email templates',
            details: error.message
        });
    }
});

// Get specific email template
router.get('/templates/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const template = emailService.getTemplate(templateId);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({
            error: 'Failed to fetch email template',
            details: error.message
        });
    }
});

// Send test email
router.post('/test-email', async (req, res) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'Email address is required' });
        }

        await emailService.sendTestEmail(to);

        res.json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            error: 'Failed to send test email',
            details: error.message
        });
    }
});

// QUEUE MANAGEMENT ROUTES

// Get queue stats
router.get('/admin/queues/stats', async (req, res) => {
    try {
        const stats = await queueService.getQueueStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching queue stats:', error);
        res.status(500).json({
            error: 'Failed to fetch queue stats',
            details: error.message
        });
    }
});

// Pause queues
router.post('/admin/queues/pause', async (req, res) => {
    try {
        await queueService.pauseQueues();
        res.json({
            success: true,
            message: 'Queues paused successfully'
        });
    } catch (error) {
        console.error('Error pausing queues:', error);
        res.status(500).json({
            error: 'Failed to pause queues',
            details: error.message
        });
    }
});

// Resume queues
router.post('/admin/queues/resume', async (req, res) => {
    try {
        await queueService.resumeQueues();
        res.json({
            success: true,
            message: 'Queues resumed successfully'
        });
    } catch (error) {
        console.error('Error resuming queues:', error);
        res.status(500).json({
            error: 'Failed to resume queues',
            details: error.message
        });
    }
});

// PREDEFINED NOTIFICATION ENDPOINTS

// Send contest start notification
router.post('/contest/start', async (req, res) => {
    try {
        const { contestId, contestTitle, participantIds } = req.body;

        if (!contestId || !contestTitle || !participantIds) {
            return res.status(400).json({
                error: 'contestId, contestTitle, and participantIds are required'
            });
        }

        await notificationService.sendContestStartNotification(contestId, contestTitle, participantIds);

        res.json({
            success: true,
            message: 'Contest start notifications sent'
        });
    } catch (error) {
        console.error('Error sending contest start notifications:', error);
        res.status(500).json({
            error: 'Failed to send contest start notifications',
            details: error.message
        });
    }
});

// Send achievement notification
router.post('/achievement', async (req, res) => {
    try {
        const { userId, achievementTitle, achievementDescription } = req.body;

        if (!userId || !achievementTitle || !achievementDescription) {
            return res.status(400).json({
                error: 'userId, achievementTitle, and achievementDescription are required'
            });
        }

        await notificationService.sendAchievementNotification(userId, achievementTitle, achievementDescription);

        res.json({
            success: true,
            message: 'Achievement notification sent'
        });
    } catch (error) {
        console.error('Error sending achievement notification:', error);
        res.status(500).json({
            error: 'Failed to send achievement notification',
            details: error.message
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'notification-service'
    });
});

export default router;