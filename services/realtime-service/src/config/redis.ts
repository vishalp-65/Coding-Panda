import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export class RedisManager {
  private static instance: RedisManager;
  private pubClient: any;
  private subClient: any;
  private dataClient: any;

  private constructor() {}

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  async initialize(redisUrl: string) {
    // Create Redis clients for Socket.IO adapter
    this.pubClient = createClient({ url: redisUrl });
    this.subClient = this.pubClient.duplicate();
    
    // Create separate client for data operations
    this.dataClient = createClient({ url: redisUrl });

    // Connect all clients
    await Promise.all([
      this.pubClient.connect(),
      this.subClient.connect(),
      this.dataClient.connect()
    ]);

    console.log('Redis clients connected successfully');
  }

  getAdapter() {
    return createAdapter(this.pubClient, this.subClient);
  }

  getDataClient() {
    return this.dataClient;
  }

  // Room management methods
  async addUserToRoom(userId: string, roomId: string): Promise<void> {
    await this.dataClient.sAdd(`room:${roomId}:users`, userId);
    await this.dataClient.sAdd(`user:${userId}:rooms`, roomId);
  }

  async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    await this.dataClient.sRem(`room:${roomId}:users`, userId);
    await this.dataClient.sRem(`user:${userId}:rooms`, roomId);
  }

  async getRoomUsers(roomId: string): Promise<string[]> {
    return await this.dataClient.sMembers(`room:${roomId}:users`);
  }

  async getUserRooms(userId: string): Promise<string[]> {
    return await this.dataClient.sMembers(`user:${userId}:rooms`);
  }

  // Notification methods
  async storeNotification(notification: any): Promise<void> {
    const key = `notification:${notification.id}`;
    await this.dataClient.hSet(key, notification);
    await this.dataClient.expire(key, 86400 * 7); // 7 days TTL
  }

  async getUserNotifications(userId: string, limit = 50): Promise<any[]> {
    const keys = await this.dataClient.keys(`notification:*`);
    const notifications = [];
    
    for (const key of keys.slice(0, limit)) {
      const notification = await this.dataClient.hGetAll(key);
      if (this.isNotificationForUser(notification, userId)) {
        notifications.push(notification);
      }
    }
    
    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Collaboration session methods
  async storeCollaborationSession(session: any): Promise<void> {
    const key = `collaboration:${session.id}`;
    await this.dataClient.hSet(key, {
      ...session,
      participants: JSON.stringify(session.participants),
      cursors: JSON.stringify(session.cursors)
    });
    await this.dataClient.expire(key, 3600 * 24); // 24 hours TTL
  }

  async getCollaborationSession(sessionId: string): Promise<any | null> {
    const key = `collaboration:${sessionId}`;
    const session = await this.dataClient.hGetAll(key);
    
    if (Object.keys(session).length === 0) {
      return null;
    }

    return {
      ...session,
      participants: JSON.parse(session.participants || '[]'),
      cursors: JSON.parse(session.cursors || '{}')
    };
  }

  // Chat message methods
  async storeChatMessage(message: any): Promise<void> {
    const key = `chat:${message.roomId}`;
    await this.dataClient.lPush(key, JSON.stringify(message));
    await this.dataClient.lTrim(key, 0, 999); // Keep last 1000 messages
    await this.dataClient.expire(key, 86400 * 30); // 30 days TTL
  }

  async getChatMessages(roomId: string, limit = 50): Promise<any[]> {
    const key = `chat:${roomId}`;
    const messages = await this.dataClient.lRange(key, 0, limit - 1);
    return messages.map((msg:any) => JSON.parse(msg)).reverse();
  }

  // Leaderboard methods
  async updateLeaderboard(contestId: string, rankings: any[]): Promise<void> {
    const key = `leaderboard:${contestId}`;
    await this.dataClient.del(key);
    
    for (const ranking of rankings) {
      await this.dataClient.zAdd(key, {
        score: ranking.score,
        value: JSON.stringify(ranking)
      });
    }
    
    await this.dataClient.expire(key, 86400 * 7); // 7 days TTL
  }

  async getLeaderboard(contestId: string, limit = 100): Promise<any[]> {
    const key = `leaderboard:${contestId}`;
    const rankings = await this.dataClient.zRangeWithScores(key, 0, limit - 1, {
      REV: true
    });
    
    return rankings.map((item:any) => JSON.parse(item.value));
  }

  private isNotificationForUser(notification: any, userId: string): boolean {
    if (notification.targetUsers) {
      const targetUsers = JSON.parse(notification.targetUsers);
      return targetUsers.includes(userId);
    }
    return true; // Global notification
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit(),
      this.subClient?.quit(),
      this.dataClient?.quit()
    ]);
  }
}