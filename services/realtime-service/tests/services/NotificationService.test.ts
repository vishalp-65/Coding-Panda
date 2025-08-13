import { Server } from 'socket.io';
import { NotificationService } from '../../src/services/NotificationService';
import { NotificationType, AuthenticatedSocket } from '../../src/types';
import { RedisManager } from '../../src/config/redis';

const mockSocket = {
  userId: 'test-user-id',
  username: 'testuser',
  roles: ['user'],
  emit: jest.fn()
} as unknown as AuthenticatedSocket;

const mockIo = {
  emit: jest.fn(),
  fetchSockets: jest.fn().mockResolvedValue([mockSocket]),
  to: jest.fn().mockReturnThis()
} as unknown as Server;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let redisManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    redisManager = RedisManager.getInstance();
    notificationService = new NotificationService(mockIo);
  });

  describe('sendNotification', () => {
    it('should send global notification', async () => {
      const notification = {
        type: NotificationType.SYSTEM,
        title: 'System Update',
        message: 'System will be updated tonight'
      };

      await notificationService.sendNotification(notification);

      expect(redisManager.storeNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          ...notification,
          id: expect.any(String),
          createdAt: expect.any(Date)
        })
      );
      expect(mockIo.emit).toHaveBeenCalledWith('notification', expect.any(Object));
    });

    it('should send notification to specific users', async () => {
      const notification = {
        type: NotificationType.ACHIEVEMENT,
        title: 'Achievement Unlocked',
        message: 'You solved 10 problems!',
        targetUsers: ['user1', 'user2']
      };

      await notificationService.sendNotification(notification);

      expect(redisManager.storeNotification).toHaveBeenCalled();
      // Should not emit globally
      expect(mockIo.emit).not.toHaveBeenCalledWith('notification', expect.any(Object));
    });

    it('should send notification to specific roles', async () => {
      const notification = {
        type: NotificationType.SYSTEM,
        title: 'Admin Notice',
        message: 'Please review pending reports',
        targetRoles: ['admin', 'moderator']
      };

      await notificationService.sendNotification(notification);

      expect(redisManager.storeNotification).toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalledWith('notification', expect.any(Object));
    });
  });

  describe('sendContestStartNotification', () => {
    it('should send contest start notification', async () => {
      const contestId = 'contest-123';
      const contestTitle = 'Weekly Contest';
      const participantIds = ['user1', 'user2'];

      await notificationService.sendContestStartNotification(contestId, contestTitle, participantIds);

      expect(redisManager.storeNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CONTEST_START,
          title: 'Contest Started',
          message: `The contest "${contestTitle}" has started!`,
          data: { contestId },
          targetUsers: participantIds
        })
      );
    });
  });

  describe('sendSubmissionResultNotification', () => {
    it('should send accepted submission notification', async () => {
      const userId = 'user-123';
      const problemTitle = 'Two Sum';
      const status = 'accepted';
      const score = 100;

      await notificationService.sendSubmissionResultNotification(userId, problemTitle, status, score);

      expect(redisManager.storeNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SUBMISSION_RESULT,
          title: 'Submission Result',
          message: `Your solution to "${problemTitle}" was accepted! Score: ${score}`,
          targetUsers: [userId]
        })
      );
    });

    it('should send rejected submission notification', async () => {
      const userId = 'user-123';
      const problemTitle = 'Two Sum';
      const status = 'wrong_answer';

      await notificationService.sendSubmissionResultNotification(userId, problemTitle, status);

      expect(redisManager.storeNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SUBMISSION_RESULT,
          title: 'Submission Result',
          message: `Your solution to "${problemTitle}" was ${status}. Try again!`,
          targetUsers: [userId]
        })
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';

      await notificationService.markNotificationAsRead(notificationId, userId);

      expect(redisManager.getDataClient().set).toHaveBeenCalledWith(
        `notification:${notificationId}:read:${userId}`,
        'true'
      );
      expect(redisManager.getDataClient().expire).toHaveBeenCalledWith(
        `notification:${notificationId}:read:${userId}`,
        86400 * 30
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        { id: '1', title: 'Test 1', message: 'Message 1' },
        { id: '2', title: 'Test 2', message: 'Message 2' }
      ];

      redisManager.getUserNotifications.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications(userId);

      expect(result).toEqual(mockNotifications);
      expect(redisManager.getUserNotifications).toHaveBeenCalledWith(userId, 50);
    });
  });

  describe('sendToUser', () => {
    it('should send notification to specific user', async () => {
      const userId = 'test-user-id';
      const notification = {
        id: 'notif-123',
        type: NotificationType.SYSTEM,
        title: 'Test',
        message: 'Test message',
        createdAt: new Date()
      };

      await notificationService.sendToUser(userId, notification);

      expect(mockSocket.emit).toHaveBeenCalledWith('notification', notification);
    });
  });

  describe('sendToRole', () => {
    it('should send notification to users with specific role', async () => {
      const role = 'admin';
      const notification = {
        id: 'notif-123',
        type: NotificationType.SYSTEM,
        title: 'Admin Notice',
        message: 'Admin message',
        createdAt: new Date()
      };

      const adminSocket = {
        ...mockSocket,
        roles: ['admin'],
        emit: jest.fn()
      } as unknown as AuthenticatedSocket;

      (mockIo.fetchSockets as jest.Mock).mockResolvedValue([adminSocket]);

      await notificationService.sendToRole(role, notification);

      expect(adminSocket.emit).toHaveBeenCalledWith('notification', notification);
    });
  });
});