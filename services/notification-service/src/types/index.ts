export enum NotificationType {
    CONTEST_START = 'contest_start',
    CONTEST_END = 'contest_end',
    CONTEST_REMINDER = 'contest_reminder',
    CONTEST_REGISTRATION = 'contest_registration',
    SUBMISSION_RESULT = 'submission_result',
    ACHIEVEMENT = 'achievement',
    MILESTONE = 'milestone',
    COLLABORATION_INVITE = 'collaboration_invite',
    SYSTEM = 'system',
    RANKING_UPDATE = 'ranking_update',
    DIGEST_EMAIL = 'digest_email',
    LEARNING_RECOMMENDATION = 'learning_recommendation',
    INTERVIEW_REMINDER = 'interview_reminder'
}

export enum NotificationChannel {
    IN_APP = 'in_app',
    EMAIL = 'email',
    BOTH = 'both'
}

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent'
}

export interface NotificationData {
    id: string;
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: Date;
    readAt?: Date;
    expiresAt?: Date;
    templateId?: string;
}

export interface NotificationPreferences {
    userId: string;
    emailNotifications: boolean;
    inAppNotifications: boolean;
    digestEmail: boolean;
    digestFrequency: 'daily' | 'weekly' | 'never';
    notificationTypes: {
        [key in NotificationType]: {
            enabled: boolean;
            channels: NotificationChannel[];
        };
    };
    quietHours?: {
        start: string; // HH:mm format
        end: string;   // HH:mm format
        timezone: string;
    };
    updatedAt: Date;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlTemplate: string;
    textTemplate: string;
    variables: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationJob {
    id: string;
    type: 'send_notification' | 'send_email' | 'send_digest';
    data: any;
    priority: number;
    attempts: number;
    delay?: number;
    createdAt: Date;
}

export interface DigestData {
    userId: string;
    period: 'daily' | 'weekly';
    notifications: NotificationData[];
    achievements: any[];
    contestUpdates: any[];
    learningProgress: any[];
    generatedAt: Date;
}

export interface NotificationAnalytics {
    id: string;
    notificationId: string;
    userId: string;
    event: 'sent' | 'delivered' | 'read' | 'clicked' | 'failed';
    channel: NotificationChannel;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface CreateNotificationRequest {
    userId?: string;
    userIds?: string[];
    type: NotificationType;
    channel: NotificationChannel;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    templateId?: string;
    scheduleAt?: Date;
    expiresAt?: Date;
}

export interface UpdatePreferencesRequest {
    emailNotifications?: boolean;
    inAppNotifications?: boolean;
    digestEmail?: boolean;
    digestFrequency?: 'daily' | 'weekly' | 'never';
    notificationTypes?: Partial<NotificationPreferences['notificationTypes']>;
    quietHours?: NotificationPreferences['quietHours'];
}

export interface NotificationStats {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
    byType: Record<NotificationType, {
        sent: number;
        delivered: number;
        read: number;
        failed: number;
    }>;
    byChannel: Record<NotificationChannel, {
        sent: number;
        delivered: number;
        read: number;
        failed: number;
    }>;
}