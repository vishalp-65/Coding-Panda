import { Contest } from '../types/contest.types';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private notificationServiceUrl: string;

  constructor() {
    this.notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
  }

  async sendContestRegistrationConfirmation(
    userId: string,
    contest: Contest
  ): Promise<void> {
    try {
      const notification: NotificationPayload = {
        userId,
        type: 'contest_registration',
        title: 'Contest Registration Confirmed',
        message: `You have successfully registered for "${contest.title}". The contest starts on ${contest.startTime.toLocaleString()}.`,
        data: {
          contestId: contest.id,
          contestTitle: contest.title,
          startTime: contest.startTime.toISOString(),
        },
      };

      await this.sendNotification(notification);
      logger.info(
        `Registration confirmation sent to user ${userId} for contest ${contest.id}`
      );
    } catch (error) {
      logger.error(
        `Error sending registration confirmation to user ${userId}:`,
        error
      );
    }
  }

  async sendContestStartNotification(
    contest: Contest,
    participantUserIds: string[]
  ): Promise<void> {
    try {
      const notifications = participantUserIds.map(userId => ({
        userId,
        type: 'contest_start',
        title: 'Contest Started',
        message: `"${contest.title}" has started! Good luck!`,
        data: {
          contestId: contest.id,
          contestTitle: contest.title,
          endTime: contest.endTime.toISOString(),
        },
      }));

      await Promise.all(
        notifications.map(notification => this.sendNotification(notification))
      );
      logger.info(
        `Contest start notifications sent for contest ${contest.id} to ${participantUserIds.length} participants`
      );
    } catch (error) {
      logger.error(
        `Error sending contest start notifications for contest ${contest.id}:`,
        error
      );
    }
  }

  async sendContestEndNotification(
    contest: Contest,
    participantUserIds: string[]
  ): Promise<void> {
    try {
      const notifications = participantUserIds.map(userId => ({
        userId,
        type: 'contest_end',
        title: 'Contest Ended',
        message: `"${contest.title}" has ended. Check your results on the leaderboard!`,
        data: {
          contestId: contest.id,
          contestTitle: contest.title,
        },
      }));

      await Promise.all(
        notifications.map(notification => this.sendNotification(notification))
      );
      logger.info(
        `Contest end notifications sent for contest ${contest.id} to ${participantUserIds.length} participants`
      );
    } catch (error) {
      logger.error(
        `Error sending contest end notifications for contest ${contest.id}:`,
        error
      );
    }
  }

  async sendContestReminder(
    contest: Contest,
    participantUserIds: string[],
    minutesBefore: number
  ): Promise<void> {
    try {
      const notifications = participantUserIds.map(userId => ({
        userId,
        type: 'contest_reminder',
        title: 'Contest Reminder',
        message: `"${contest.title}" starts in ${minutesBefore} minutes. Get ready!`,
        data: {
          contestId: contest.id,
          contestTitle: contest.title,
          startTime: contest.startTime.toISOString(),
          minutesBefore,
        },
      }));

      await Promise.all(
        notifications.map(notification => this.sendNotification(notification))
      );
      logger.info(
        `Contest reminder notifications sent for contest ${contest.id} to ${participantUserIds.length} participants`
      );
    } catch (error) {
      logger.error(
        `Error sending contest reminder notifications for contest ${contest.id}:`,
        error
      );
    }
  }

  async sendRankingUpdateNotification(
    userId: string,
    contestId: string,
    newRank: number,
    oldRank?: number
  ): Promise<void> {
    try {
      let message = `Your rank in the contest is now #${newRank}`;
      if (oldRank && oldRank !== newRank) {
        if (newRank < oldRank) {
          message += ` (up from #${oldRank})! 🎉`;
        } else {
          message += ` (down from #${oldRank})`;
        }
      }

      const notification: NotificationPayload = {
        userId,
        type: 'ranking_update',
        title: 'Ranking Update',
        message,
        data: {
          contestId,
          newRank,
          oldRank,
        },
      };

      await this.sendNotification(notification);
      logger.info(
        `Ranking update notification sent to user ${userId} for contest ${contestId}`
      );
    } catch (error) {
      logger.error(
        `Error sending ranking update notification to user ${userId}:`,
        error
      );
    }
  }

  private async sendNotification(
    notification: NotificationPayload
  ): Promise<void> {
    try {
      // In a real implementation, this would make an HTTP request to the notification service
      // For now, we'll just log the notification
      logger.info('Notification sent:', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      });

      // Simulate HTTP request
      // const response = await fetch(`${this.notificationServiceUrl}/notifications`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(notification)
      // });

      // if (!response.ok) {
      //   throw new Error(`Notification service responded with status: ${response.status}`);
      // }
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }
}
