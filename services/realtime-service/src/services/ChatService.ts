import { Server } from 'socket.io';
import { RedisManager } from '../config/redis';
import { AuthenticatedSocket, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ChatService {
  private io: Server;
  private redis: RedisManager;

  constructor(io: Server) {
    this.io = io;
    this.redis = RedisManager.getInstance();
  }

  async sendMessage(
    socket: AuthenticatedSocket, 
    roomId: string, 
    content: string, 
    replyTo?: string
  ): Promise<void> {
    try {
      if (!socket.userId || !socket.username) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate message content
      if (!content.trim()) {
        socket.emit('error', { message: 'Message content cannot be empty' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      // Check if user is in the room
      const roomUsers = await this.redis.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        socket.emit('error', { message: 'You are not in this room' });
        return;
      }

      // Create message object
      const message: ChatMessage = {
        id: uuidv4(),
        userId: socket.userId,
        username: socket.username,
        content: content.trim(),
        roomId,
        timestamp: new Date(),
        replyTo
      };

      // Store message in Redis
      await this.redis.storeChatMessage(message);

      // Broadcast message to all users in the room
      this.io.to(roomId).emit('message-received', message);

      console.log(`Message sent in room ${roomId} by ${socket.username}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async getMessageHistory(roomId: string, limit = 50): Promise<ChatMessage[]> {
    try {
      return await this.redis.getChatMessages(roomId, limit);
    } catch (error) {
      console.error('Error getting message history:', error);
      return [];
    }
  }

  async editMessage(
    socket: AuthenticatedSocket, 
    messageId: string, 
    newContent: string
  ): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate new content
      if (!newContent.trim()) {
        socket.emit('error', { message: 'Message content cannot be empty' });
        return;
      }

      if (newContent.length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      // Get original message
      const originalMessage = await this.getMessageById(messageId);
      if (!originalMessage) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user owns the message
      if (originalMessage.userId !== socket.userId) {
        socket.emit('error', { message: 'You can only edit your own messages' });
        return;
      }

      // Check if message is not too old (e.g., 15 minutes)
      const messageAge = Date.now() - originalMessage.timestamp.getTime();
      if (messageAge > 15 * 60 * 1000) {
        socket.emit('error', { message: 'Message is too old to edit' });
        return;
      }

      // Update message
      const updatedMessage: ChatMessage = {
        ...originalMessage,
        content: newContent.trim(),
        edited: true,
        editedAt: new Date()
      };

      // Store updated message
      await this.updateMessage(updatedMessage);

      // Broadcast update to room
      this.io.to(originalMessage.roomId).emit('message-updated', updatedMessage);

      console.log(`Message ${messageId} edited by ${socket.username}`);
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  }

  async deleteMessage(socket: AuthenticatedSocket, messageId: string): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const message = await this.getMessageById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check permissions (user owns message or is moderator)
      const canDelete = message.userId === socket.userId || 
                       socket.roles?.includes('moderator') || 
                       socket.roles?.includes('admin');

      if (!canDelete) {
        socket.emit('error', { message: 'You cannot delete this message' });
        return;
      }

      // Mark message as deleted instead of actually deleting
      const deletedMessage: ChatMessage = {
        ...message,
        content: '[Message deleted]',
        edited: true,
        editedAt: new Date()
      };

      await this.updateMessage(deletedMessage);

      // Broadcast deletion to room
      this.io.to(message.roomId).emit('message-deleted', {
        messageId,
        deletedBy: socket.userId
      });

      console.log(`Message ${messageId} deleted by ${socket.username}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }

  async handleTypingStart(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    if (!socket.userId) return;

    // Check if user is in room
    const roomUsers = await this.redis.getRoomUsers(roomId);
    if (!roomUsers.includes(socket.userId)) return;

    // Broadcast typing indicator to other users in room
    socket.to(roomId).emit('user-typing', {
      roomId,
      userId: socket.userId,
      username: socket.username,
      typing: true
    });

    // Set typing indicator with TTL
    const key = `typing:${roomId}:${socket.userId}`;
    await this.redis.getDataClient().setEx(key, 5, 'typing');
  }

  async handleTypingStop(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    if (!socket.userId) return;

    // Remove typing indicator
    const key = `typing:${roomId}:${socket.userId}`;
    await this.redis.getDataClient().del(key);

    // Broadcast stop typing to other users in room
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

  async reportMessage(
    socket: AuthenticatedSocket, 
    messageId: string, 
    reason: string
  ): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const message = await this.getMessageById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Store report
      const reportKey = `report:${messageId}:${socket.userId}`;
      await this.redis.getDataClient().hSet(reportKey, {
        messageId,
        reportedBy: socket.userId,
        reason,
        timestamp: new Date().toISOString()
      });

      // Notify moderators
      const sockets = await this.io.fetchSockets();
      const moderatorSockets = sockets.filter(s => {
        const authSocket = s as any;
        return authSocket.roles?.includes('moderator') || authSocket.roles?.includes('admin');
      });

      moderatorSockets.forEach(socket => {
        socket.emit('message-reported', {
          messageId,
          message,
          reportedBy: (socket as any).userId,
          reason,
          timestamp: new Date()
        });
      });

      socket.emit('message-report-sent', { messageId });
      console.log(`Message ${messageId} reported by ${socket.username} for: ${reason}`);
    } catch (error) {
      console.error('Error reporting message:', error);
      socket.emit('error', { message: 'Failed to report message' });
    }
  }

  // Private helper methods
  private async getMessageById(messageId: string): Promise<ChatMessage | null> {
    // This is a simplified implementation
    // In production, you'd maintain a proper message index
    const keys = await this.redis.getDataClient().keys('chat:*');
    
    for (const key of keys) {
      const messages = await this.redis.getDataClient().lRange(key, 0, -1);
      for (const msgStr of messages) {
        const message = JSON.parse(msgStr);
        if (message.id === messageId) {
          return message;
        }
      }
    }
    
    return null;
  }

  private async updateMessage(message: ChatMessage): Promise<void> {
    // This is a simplified implementation
    // In production, you'd have a more efficient way to update messages
    const key = `chat:${message.roomId}`;
    const messages = await this.redis.getDataClient().lRange(key, 0, -1);
    
    const updatedMessages = messages.map((msgStr: string) => {
      const msg = JSON.parse(msgStr);
      return msg.id === message.id ? JSON.stringify(message) : msgStr;
    });

    // Replace the entire list (not efficient, but works for demo)
    await this.redis.getDataClient().del(key);
    if (updatedMessages.length > 0) {
      await this.redis.getDataClient().lPush(key, ...updatedMessages);
    }
  }

  // Moderation methods
  async muteUser(roomId: string, userId: string, duration: number): Promise<void> {
    const key = `mute:${roomId}:${userId}`;
    await this.redis.getDataClient().setEx(key, duration, 'muted');
  }

  async isUserMuted(roomId: string, userId: string): Promise<boolean> {
    const key = `mute:${roomId}:${userId}`;
    const result = await this.redis.getDataClient().get(key);
    return result === 'muted';
  }

  async getMessageReports(messageId: string): Promise<any[]> {
    const keys = await this.redis.getDataClient().keys(`report:${messageId}:*`);
    const reports = [];
    
    for (const key of keys) {
      const report = await this.redis.getDataClient().hGetAll(key);
      reports.push(report);
    }
    
    return reports;
  }
}