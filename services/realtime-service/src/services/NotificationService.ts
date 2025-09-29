import { Server } from 'socket.io';
import { RedisManager } from '../config/redis';
import { NotificationData, NotificationType, AuthenticatedSocket } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  private io: Server;
  private redis: RedisManager;

  constructor(io: Server) {
    this.io = io;
    this.redis = RedisManager.getInstance();
  }

  async sendNotification(notification: Omit<NotificationData, 'id' | 'createdAt'>): Promise<void> {
    const fullNotification: NotificationData = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date()
    };

    try {
      // Store notification in Redis
      await this.redis.storeNotification(fullNotification);

      // Send to specific users if targetUsers is provided
      if (notification.targetUsers && notification.targetUsers.length > 0) {
        for (const userId of notification.targetUsers) {
          await this.sendToUser(userId, fullNotification);
        }
      }
      // Send to specific roles if targetRoles is provided
      else if (notification.targetRoles && notification.targetRoles.length > 0) {
        for (const role of notification.targetRoles) {
          await this.sendToRole(role, fullNotification);
        }
      }
      // Send to all connected users (global notification)
      else {
        this.io.emit('notification', fullNotification);
      }

      console.log(`Notification sent: ${fullNotification.type} - ${fullNotification.title}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async sendToUser(userId: string, notification: NotificationData): Promise<void> {
    const sockets = await this.io.fetchSockets();
    const userSockets = sockets.filter(s => (s as any).userId === userId);
    
    userSockets.forEach(socket => {
      socket.emit('notification', notification);
    });
  }

  async sendToRole(role: string, notification: NotificationData): Promise<void> {
    const sockets = await this.io.fetchSockets();
    const roleSockets = sockets.filter(s => {
      const authSocket = s as any;
      return authSocket.roles?.includes(role);
    });
    
    roleSockets.forEach(socket => {
      socket.emit('notification', notification);
    });
  }

  async getUserNotifications(userId: string, limit = 50): Promise<NotificationData[]> {
    return await this.redis.getUserNotifications(userId, limit);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const key = `notification:${notificationId}:read:${userId}`;
    await this.redis.getDataClient().set(key, 'true');
    await this.redis.getDataClient().expire(key, 86400 * 30); // 30 days TTL
  }

  async isNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const key = `notification:${notificationId}:read:${userId}`;
    const result = await this.redis.getDataClient().get(key);
    return result === 'true';
  }

  // Predefined notification types
  async sendContestStartNotification(contestId: string, contestTitle: string, participantIds: string[]): Promise<void> {
    await this.sendNotification({
      type: NotificationType.CONTEST_START,
      title: 'Contest Started',
      message: `The contest "${contestTitle}" has started!`,
      data: { contestId },
      targetUsers: participantIds
    });
  }

  async sendContestEndNotification(contestId: string, contestTitle: string, participantIds: string[]): Promise<void> {
    await this.sendNotification({
      type: NotificationType.CONTEST_END,
      title: 'Contest Ended',
      message: `The contest "${contestTitle}" has ended. Check your results!`,
      data: { contestId },
      targetUsers: participantIds
    });
  }

  async sendSubmissionResultNotification(
    userId: string, 
    problemTitle: string, 
    status: string, 
    score?: number
  ): Promise<void> {
    const message = status === 'accepted' 
      ? `Your solution to "${problemTitle}" was accepted!${score ? ` Score: ${score}` : ''}`
      : `Your solution to "${problemTitle}" was ${status}. Try again!`;

    await this.sendNotification({
      type: NotificationType.SUBMISSION_RESULT,
      title: 'Submission Result',
      message,
      data: { problemTitle, status, score },
      targetUsers: [userId]
    });
  }

  async sendAchievementNotification(
    userId: string, 
    achievementTitle: string, 
    achievementDescription: string
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.ACHIEVEMENT,
      title: 'Achievement Unlocked!',
      message: `You've earned the "${achievementTitle}" achievement: ${achievementDescription}`,
      data: { achievementTitle, achievementDescription },
      targetUsers: [userId]
    });
  }

  async sendCollaborationInviteNotification(
    inviteeId: string, 
    inviterUsername: string, 
    sessionId: string,
    problemTitle?: string
  ): Promise<void> {
    const message = problemTitle 
      ? `${inviterUsername} invited you to collaborate on "${problemTitle}"`
      : `${inviterUsername} invited you to a collaboration session`;

    await this.sendNotification({
      type: NotificationType.COLLABORATION_INVITE,
      title: 'Collaboration Invite',
      message,
      data: { sessionId, inviterUsername, problemTitle },
      targetUsers: [inviteeId]
    });
  }

  async sendSystemNotification(message: string, targetUsers?: string[], targetRoles?: string[]): Promise<void> {
    await this.sendNotification({
      type: NotificationType.SYSTEM,
      title: 'System Notification',
      message,
      targetUsers,
      targetRoles
    });
  }

  // Bulk notification methods
  async sendBulkNotifications(notifications: Omit<NotificationData, 'id' | 'createdAt'>[]): Promise<void> {
    const promises = notifications.map(notification => this.sendNotification(notification));
    await Promise.all(promises);
  }

  // Notification cleanup
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const keys = await this.redis.getDataClient().keys('notification:*');
      const now = new Date();
      
      for (const key of keys) {
        const notification = await this.redis.getDataClient().hGetAll(key);
        if (notification.expiresAt && new Date(notification.expiresAt) < now) {
          await this.redis.getDataClient().del(key);
        }
      }
      
      console.log(`Cleaned up expired notifications`);
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }
}