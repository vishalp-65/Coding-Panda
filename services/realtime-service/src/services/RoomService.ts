import { Server } from 'socket.io';
import { RedisManager } from '../config/redis';
import { AuthenticatedSocket, RoomType, RoomData } from '../types';
import { validateRoomAccess } from '../middleware/auth';

export class RoomService {
  private io: Server;
  private redis: RedisManager;

  constructor(io: Server) {
    this.io = io;
    this.redis = RedisManager.getInstance();
  }

  async joinRoom(socket: AuthenticatedSocket, roomId: string, roomType: RoomType): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate room access
      const hasAccess = await validateRoomAccess(socket, roomId, roomType);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to room' });
        return;
      }

      // Join the Socket.IO room
      await socket.join(roomId);

      // Update Redis with room membership
      await this.redis.addUserToRoom(socket.userId, roomId);

      // Get current room participants
      const participants = await this.redis.getRoomUsers(roomId);

      // Notify user they joined successfully
      socket.emit('room-joined', {
        roomId,
        participants: participants.filter(id => id !== socket.userId)
      });

      // Notify other users in the room
      socket.to(roomId).emit('user-joined-room', {
        roomId,
        userId: socket.userId,
        username: socket.username
      });

      console.log(`User ${socket.username} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  async leaveRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      if (!socket.userId) {
        return;
      }

      // Leave the Socket.IO room
      await socket.leave(roomId);

      // Update Redis
      await this.redis.removeUserFromRoom(socket.userId, roomId);

      // Notify user they left
      socket.emit('room-left', { roomId });

      // Notify other users in the room
      socket.to(roomId).emit('user-left-room', {
        roomId,
        userId: socket.userId,
        username: socket.username
      });

      console.log(`User ${socket.username} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  async leaveAllRooms(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!socket.userId) {
        return;
      }

      const userRooms = await this.redis.getUserRooms(socket.userId);
      
      for (const roomId of userRooms) {
        await this.leaveRoom(socket, roomId);
      }
    } catch (error) {
      console.error('Error leaving all rooms:', error);
    }
  }

  async getRoomParticipants(roomId: string): Promise<string[]> {
    return await this.redis.getRoomUsers(roomId);
  }

  async broadcastToRoom(roomId: string, event: string, data: any): Promise<void> {
    this.io.to(roomId).emit(event, data);
  }

  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    // Find all sockets for this user
    const sockets = await this.io.fetchSockets();
    const userSockets = sockets.filter(s => (s as any).userId === userId);
    
    userSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  async broadcastToRole(role: string, event: string, data: any): Promise<void> {
    const sockets = await this.io.fetchSockets();
    const roleSockets = sockets.filter(s => {
      const authSocket = s as any;
      return authSocket.roles?.includes(role);
    });
    
    roleSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  async getRoomStats(roomId: string): Promise<{ participantCount: number; participants: string[] }> {
    const participants = await this.getRoomParticipants(roomId);
    return {
      participantCount: participants.length,
      participants
    };
  }

  // Room metadata management
  async setRoomMetadata(roomId: string, metadata: Record<string, any>): Promise<void> {
    const key = `room:${roomId}:metadata`;
    await this.redis.getDataClient().hSet(key, metadata);
    await this.redis.getDataClient().expire(key, 86400); // 24 hours TTL
  }

  async getRoomMetadata(roomId: string): Promise<Record<string, any>> {
    const key = `room:${roomId}:metadata`;
    return await this.redis.getDataClient().hGetAll(key);
  }

  // Typing indicators
  async handleTypingStart(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    if (!socket.userId) return;

    socket.to(roomId).emit('user-typing', {
      roomId,
      userId: socket.userId,
      username: socket.username
    });

    // Set typing indicator with TTL
    const key = `typing:${roomId}:${socket.userId}`;
    await this.redis.getDataClient().setEx(key, 5, 'typing'); // 5 seconds TTL
  }

  async handleTypingStop(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    if (!socket.userId) return;

    // Remove typing indicator
    const key = `typing:${roomId}:${socket.userId}`;
    await this.redis.getDataClient().del(key);

    socket.to(roomId).emit('user-typing', {
      roomId,
      userId: socket.userId,
      username: socket.username,
      typing: false
    });
  }

  async getTypingUsers(roomId: string): Promise<string[]> {
    const keys = await this.redis.getDataClient().keys(`typing:${roomId}:*`);
    return keys.map((key: string) => key.split(':')[2]);
  }
}