import { Server } from 'socket.io';
import { AuthenticatedSocket, RoomType } from '../types';
import { RoomService } from '../services/RoomService';
import { NotificationService } from '../services/NotificationService';
import { CollaborationService } from '../services/CollaborationService';
import { ChatService } from '../services/ChatService';
import { LeaderboardService } from '../services/LeaderboardService';

export class SocketHandlers {
  private io: Server;
  private roomService: RoomService;
  private notificationService: NotificationService;
  private collaborationService: CollaborationService;
  private chatService: ChatService;
  private leaderboardService: LeaderboardService;

  constructor(io: Server) {
    this.io = io;
    this.roomService = new RoomService(io);
    this.notificationService = new NotificationService(io);
    this.collaborationService = new CollaborationService(io);
    this.chatService = new ChatService(io);
    this.leaderboardService = new LeaderboardService(io);
  }

  setupHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} (${socket.userId}) connected`);

      // Room management handlers
      this.setupRoomHandlers(socket);

      // Chat handlers
      this.setupChatHandlers(socket);

      // Collaboration handlers
      this.setupCollaborationHandlers(socket);

      // Notification handlers
      this.setupNotificationHandlers(socket);

      // Contest/Leaderboard handlers
      this.setupContestHandlers(socket);

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Error handler
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.username}:`, error);
      });
    });
  }

  private setupRoomHandlers(socket: AuthenticatedSocket): void {
    socket.on('join-room', async (data: { roomId: string; roomType: RoomType }) => {
      await this.roomService.joinRoom(socket, data.roomId, data.roomType);
    });

    socket.on('leave-room', async (data: { roomId: string }) => {
      await this.roomService.leaveRoom(socket, data.roomId);
    });

    socket.on('get-room-participants', async (data: { roomId: string }, callback) => {
      try {
        const participants = await this.roomService.getRoomParticipants(data.roomId);
        callback({ success: true, participants });
      } catch (error) {
        callback({ success: false, error: 'Failed to get room participants' });
      }
    });

    socket.on('typing-start', async (data: { roomId: string }) => {
      await this.roomService.handleTypingStart(socket, data.roomId);
    });

    socket.on('typing-stop', async (data: { roomId: string }) => {
      await this.roomService.handleTypingStop(socket, data.roomId);
    });
  }

  private setupChatHandlers(socket: AuthenticatedSocket): void {
    socket.on('send-message', async (data: { roomId: string; content: string; replyTo?: string }) => {
      await this.chatService.sendMessage(socket, data.roomId, data.content, data.replyTo);
    });

    socket.on('edit-message', async (data: { messageId: string; content: string }) => {
      await this.chatService.editMessage(socket, data.messageId, data.content);
    });

    socket.on('delete-message', async (data: { messageId: string }) => {
      await this.chatService.deleteMessage(socket, data.messageId);
    });

    socket.on('report-message', async (data: { messageId: string; reason: string }) => {
      await this.chatService.reportMessage(socket, data.messageId, data.reason);
    });

    socket.on('get-message-history', async (data: { roomId: string; limit?: number }, callback) => {
      try {
        const messages = await this.chatService.getMessageHistory(data.roomId, data.limit);
        callback({ success: true, messages });
      } catch (error) {
        callback({ success: false, error: 'Failed to get message history' });
      }
    });

    socket.on('typing-start', async (data: { roomId: string }) => {
      await this.chatService.handleTypingStart(socket, data.roomId);
    });

    socket.on('typing-stop', async (data: { roomId: string }) => {
      await this.chatService.handleTypingStop(socket, data.roomId);
    });
  }

  private setupCollaborationHandlers(socket: AuthenticatedSocket): void {
    socket.on('create-collaboration', async (data: { problemId?: string; language?: string }, callback) => {
      try {
        if (!socket.userId) {
          callback({ success: false, error: 'User not authenticated' });
          return;
        }

        const session = await this.collaborationService.createSession(
          socket.userId,
          data.problemId,
          data.language
        );
        callback({ success: true, session });
      } catch (error) {
        callback({ success: false, error: 'Failed to create collaboration session' });
      }
    });

    socket.on('join-collaboration', async (data: { sessionId: string }) => {
      await this.collaborationService.joinSession(socket, data.sessionId);
    });

    socket.on('leave-collaboration', async (data: { sessionId: string }) => {
      await this.collaborationService.leaveSession(socket, data.sessionId);
    });

    socket.on('code-change', async (data: { sessionId: string; code: string; version: number }) => {
      await this.collaborationService.handleCodeChange(socket, data.sessionId, data.code, data.version);
    });

    socket.on('cursor-move', async (data: { sessionId: string; line: number; column: number; selection?: any }) => {
      const position = {
        userId: socket.userId!,
        line: data.line,
        column: data.column,
        selection: data.selection
      };
      await this.collaborationService.handleCursorMove(socket, data.sessionId, position);
    });

    socket.on('invite-to-collaboration', async (data: { sessionId: string; inviteeId: string }, callback) => {
      try {
        if (!socket.userId) {
          callback({ success: false, error: 'User not authenticated' });
          return;
        }

        await this.collaborationService.inviteToSession(data.sessionId, socket.userId, data.inviteeId);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: (error as Error).message });
      }
    });

    socket.on('set-collaboration-language', async (data: { sessionId: string; language: string }, callback) => {
      try {
        if (!socket.userId) {
          callback({ success: false, error: 'User not authenticated' });
          return;
        }

        await this.collaborationService.setSessionLanguage(data.sessionId, data.language, socket.userId);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: (error as Error).message });
      }
    });

    socket.on('get-user-collaborations', async (callback) => {
      try {
        if (!socket.userId) {
          callback({ success: false, error: 'User not authenticated' });
          return;
        }

        const sessions = await this.collaborationService.getUserSessions(socket.userId);
        callback({ success: true, sessions });
      } catch (error) {
        callback({ success: false, error: 'Failed to get user collaborations' });
      }
    });
  }

  private setupNotificationHandlers(socket: AuthenticatedSocket): void {
    socket.on('mark-notification-read', async (data: { notificationId: string }) => {
      if (!socket.userId) return;

      await this.notificationService.markNotificationAsRead(data.notificationId, socket.userId);
    });

    socket.on('get-notifications', async (data: { limit?: number }, callback) => {
      try {
        if (!socket.userId) {
          callback({ success: false, error: 'User not authenticated' });
          return;
        }

        const notifications = await this.notificationService.getUserNotifications(socket.userId, data.limit);
        callback({ success: true, notifications });
      } catch (error) {
        callback({ success: false, error: 'Failed to get notifications' });
      }
    });
  }

  private setupContestHandlers(socket: AuthenticatedSocket): void {
    socket.on('join-contest', async (data: { contestId: string }) => {
      await this.roomService.joinRoom(socket, `contest:${data.contestId}`, RoomType.CONTEST);

      // Send current leaderboard
      const leaderboard = await this.leaderboardService.getContestLeaderboard(data.contestId);
      socket.emit('leaderboard-update', {
        contestId: data.contestId,
        rankings: leaderboard,
        lastUpdated: new Date()
      });
    });

    socket.on('leave-contest', async (data: { contestId: string }) => {
      await this.roomService.leaveRoom(socket, `contest:${data.contestId}`);
    });

    socket.on('get-leaderboard', async (data: { contestId: string; limit?: number }, callback) => {
      try {
        const rankings = await this.leaderboardService.getContestLeaderboard(data.contestId, data.limit);
        callback({ success: true, rankings });
      } catch (error) {
        callback({ success: false, error: 'Failed to get leaderboard' });
      }
    });

    socket.on('get-user-rank', async (data: { contestId: string }, callback) => {
      try {
        if (!socket.userId) {
          callback({ success: false, error: 'User not authenticated' });
          return;
        }

        const ranking = await this.leaderboardService.getUserRank(data.contestId, socket.userId);
        callback({ success: true, ranking });
      } catch (error) {
        callback({ success: false, error: 'Failed to get user rank' });
      }
    });
  }

  private async handleDisconnect(socket: AuthenticatedSocket, reason: string): Promise<void> {
    console.log(`User ${socket.username} (${socket.userId}) disconnected: ${reason}`);

    try {
      // Leave all rooms
      await this.roomService.leaveAllRooms(socket);

      // Clean up any collaboration sessions
      if (socket.userId) {
        const sessions = await this.collaborationService.getUserSessions(socket.userId);
        for (const session of sessions) {
          await this.collaborationService.leaveSession(socket, session.id);
        }
      }
    } catch (error) {
      console.error('Error during disconnect cleanup:', error);
    }
  }

  // Public methods for external services to trigger events
  public async sendNotificationToUser(userId: string, notification: any): Promise<void> {
    await this.notificationService.sendToUser(userId, notification);
  }

  public async updateContestLeaderboard(contestId: string, rankings: any[]): Promise<void> {
    await this.leaderboardService.updateContestLeaderboard(contestId, rankings);
  }

  public async broadcastToRoom(roomId: string, event: string, data: any): Promise<void> {
    await this.roomService.broadcastToRoom(roomId, event, data);
  }

  public async sendContestAnnouncement(contestId: string, message: string): Promise<void> {
    this.io.to(`contest:${contestId}`).emit('contest-announcement', {
      contestId,
      message,
      timestamp: new Date()
    });
  }
}