import cron from 'node-cron';
import { ContestService } from './contest.service';
import { ContestRepository } from '../repositories/contest.repository';
import { NotificationService } from './notification.service';
import { ContestStatus } from '../types/contest.types';
import { logger } from '../utils/logger';

export class SchedulerService {
  constructor(
    private contestService: ContestService,
    private contestRepository: ContestRepository,
    private notificationService: NotificationService
  ) { }

  start(): void {
    // Update contest statuses every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.contestService.updateContestStatuses();
      } catch (error) {
        logger.error('Error updating contest statuses:', error);
      }
    });

    // Send contest reminders every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.sendContestReminders();
      } catch (error) {
        logger.error('Error sending contest reminders:', error);
      }
    });

    // Send contest start notifications every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.sendContestStartNotifications();
      } catch (error) {
        logger.error('Error sending contest start notifications:', error);
      }
    });

    // Send contest end notifications every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.sendContestEndNotifications();
      } catch (error) {
        logger.error('Error sending contest end notifications:', error);
      }
    });

    // Calculate final rankings for ended contests every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        await this.calculateFinalRankings();
      } catch (error) {
        logger.error('Error calculating final rankings:', error);
      }
    });

    logger.info('Contest scheduler started');
  }

  private async sendContestReminders(): Promise<void> {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const twentyFourHoursFromNow = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      );

      // Find contests starting in 1 hour or 24 hours
      const { contests } = await this.contestRepository.searchContests({
        status: ContestStatus.UPCOMING,
        startDate: now.toISOString(),
        endDate: twentyFourHoursFromNow.toISOString(),
      });

      for (const contest of contests) {
        const startTime = new Date(contest.startTime);
        const timeDiff = startTime.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));

        // Send reminder for contests starting in approximately 1 hour (55-65 minutes)
        if (minutesDiff >= 55 && minutesDiff <= 65) {
          const participants =
            await this.contestRepository.getContestParticipants(contest.id);
          const participantUserIds = participants.map(p => p.userId);

          if (participantUserIds.length > 0) {
            await this.notificationService.sendContestReminder(
              contest,
              participantUserIds,
              60
            );
          }
        }

        // Send reminder for contests starting in approximately 24 hours (23.5-24.5 hours)
        if (minutesDiff >= 1410 && minutesDiff <= 1470) {
          // 23.5 to 24.5 hours in minutes
          const participants =
            await this.contestRepository.getContestParticipants(contest.id);
          const participantUserIds = participants.map(p => p.userId);

          if (participantUserIds.length > 0) {
            await this.notificationService.sendContestReminder(
              contest,
              participantUserIds,
              1440
            );
          }
        }
      }
    } catch (error) {
      logger.error('Error in sendContestReminders:', error);
    }
  }

  private async sendContestStartNotifications(): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Find contests that just started (within the last 5 minutes)
      const { contests } = await this.contestRepository.searchContests({
        status: ContestStatus.ONGOING,
        startDate: fiveMinutesAgo.toISOString(),
        endDate: now.toISOString(),
      });

      for (const contest of contests) {
        const participants =
          await this.contestRepository.getContestParticipants(contest.id);
        const participantUserIds = participants.map(p => p.userId);

        if (participantUserIds.length > 0) {
          await this.notificationService.sendContestStartNotification(
            contest,
            participantUserIds
          );
        }
      }
    } catch (error) {
      logger.error('Error in sendContestStartNotifications:', error);
    }
  }

  private async sendContestEndNotifications(): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Find contests that just ended (within the last 5 minutes)
      const { contests } = await this.contestRepository.searchContests({
        status: ContestStatus.ENDED,
        endDate: fiveMinutesAgo.toISOString(),
      });

      for (const contest of contests) {
        // Check if we haven't already sent end notifications for this contest
        // In a real implementation, you'd track this in the database
        const participants =
          await this.contestRepository.getContestParticipants(contest.id);
        const participantUserIds = participants.map(p => p.userId);

        // if (participantUserIds.length > 0) {
        //   await this.notificationService.sendContestEndNotification(
        //     contest,
        //     participantUserIds
        //   );
        // }
      }
    } catch (error) {
      logger.error('Error in sendContestEndNotifications:', error);
    }
  }

  private async calculateFinalRankings(): Promise<void> {
    try {
      const { contests } = await this.contestRepository.searchContests({
        status: ContestStatus.ENDED,
      });

      for (const contest of contests) {
        // Calculate final rankings for ended contests
        await this.contestRepository.calculateRankings(contest.id);
        logger.info(`Final rankings calculated for contest ${contest.id}`);
      }
    } catch (error) {
      logger.error('Error in calculateFinalRankings:', error);
    }
  }
}
