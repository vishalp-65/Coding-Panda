import { Server } from 'socket.io';
import { RedisManager } from '../config/redis';
import { AuthenticatedSocket, CollaborationSession, CursorPosition } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CollaborationService {
  private io: Server;
  private redis: RedisManager;

  constructor(io: Server) {
    this.io = io;
    this.redis = RedisManager.getInstance();
  }

  async createSession(
    creatorId: string, 
    problemId?: string, 
    language = 'javascript'
  ): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: uuidv4(),
      problemId,
      participants: [creatorId],
      sharedCode: '',
      language,
      cursors: {},
      lastModified: new Date(),
      version: 0
    };

    await this.redis.storeCollaborationSession(session);
    return session;
  }

  async joinSession(socket: AuthenticatedSocket, sessionId: string): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const session = await this.redis.getCollaborationSession(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Collaboration session not found' });
        return;
      }

      // Add user to session if not already present
      if (!session.participants.includes(socket.userId)) {
        session.participants.push(socket.userId);
        await this.redis.storeCollaborationSession(session);
      }

      // Join the Socket.IO room
      await socket.join(`collaboration:${sessionId}`);

      // Send current session state to the joining user
      socket.emit('collaboration-session-joined', {
        sessionId,
        code: session.sharedCode,
        language: session.language,
        participants: session.participants,
        cursors: session.cursors,
        version: session.version
      });

      // Notify other participants
      socket.to(`collaboration:${sessionId}`).emit('user-joined-collaboration', {
        sessionId,
        userId: socket.userId,
        username: socket.username
      });

      console.log(`User ${socket.username} joined collaboration session ${sessionId}`);
    } catch (error) {
      console.error('Error joining collaboration session:', error);
      socket.emit('error', { message: 'Failed to join collaboration session' });
    }
  }

  async leaveSession(socket: AuthenticatedSocket, sessionId: string): Promise<void> {
    try {
      if (!socket.userId) return;

      const session = await this.redis.getCollaborationSession(sessionId);
      if (session) {
        // Remove user from participants
        session.participants = session.participants.filter((id: string) => id !== socket.userId);
        
        // Remove user's cursor
        delete session.cursors[socket.userId];
        
        await this.redis.storeCollaborationSession(session);
      }

      // Leave the Socket.IO room
      await socket.leave(`collaboration:${sessionId}`);

      // Notify other participants
      socket.to(`collaboration:${sessionId}`).emit('user-left-collaboration', {
        sessionId,
        userId: socket.userId,
        username: socket.username
      });

      console.log(`User ${socket.username} left collaboration session ${sessionId}`);
    } catch (error) {
      console.error('Error leaving collaboration session:', error);
    }
  }

  async handleCodeChange(
    socket: AuthenticatedSocket, 
    sessionId: string, 
    code: string, 
    version: number
  ): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const session = await this.redis.getCollaborationSession(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Collaboration session not found' });
        return;
      }

      // Check for version conflicts (simple conflict resolution)
      if (version < session.version) {
        socket.emit('collaboration-conflict', {
          sessionId,
          conflictVersion: version,
          currentVersion: session.version,
          currentCode: session.sharedCode
        });
        return;
      }

      // Update session with new code
      session.sharedCode = code;
      session.version = version + 1;
      session.lastModified = new Date();

      await this.redis.storeCollaborationSession(session);

      // Broadcast code change to all other participants
      socket.to(`collaboration:${sessionId}`).emit('code-updated', {
        sessionId,
        code,
        version: session.version,
        userId: socket.userId,
        username: socket.username
      });

      console.log(`Code updated in session ${sessionId} by ${socket.username}`);
    } catch (error) {
      console.error('Error handling code change:', error);
      socket.emit('error', { message: 'Failed to update code' });
    }
  }

  async handleCursorMove(
    socket: AuthenticatedSocket, 
    sessionId: string, 
    position: CursorPosition
  ): Promise<void> {
    try {
      if (!socket.userId) return;

      const session = await this.redis.getCollaborationSession(sessionId);
      if (!session) return;

      // Update cursor position
      position.userId = socket.userId;
      session.cursors[socket.userId] = position;

      await this.redis.storeCollaborationSession(session);

      // Broadcast cursor position to other participants
      socket.to(`collaboration:${sessionId}`).emit('cursor-updated', {
        sessionId,
        cursors: session.cursors
      });
    } catch (error) {
      console.error('Error handling cursor move:', error);
    }
  }

  async getSession(sessionId: string): Promise<CollaborationSession | null> {
    return await this.redis.getCollaborationSession(sessionId);
  }

  async getUserSessions(userId: string): Promise<CollaborationSession[]> {
    // This is a simplified implementation
    // In a real scenario, you'd maintain an index of user sessions
    const keys = await this.redis.getDataClient().keys('collaboration:*');
    const sessions: CollaborationSession[] = [];

    for (const key of keys) {
      const sessionId = key.split(':')[1];
      const session = await this.redis.getCollaborationSession(sessionId);
      if (session && session.participants.includes(userId)) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async inviteToSession(
    sessionId: string, 
    inviterId: string, 
    inviteeId: string
  ): Promise<void> {
    try {
      const session = await this.redis.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.participants.includes(inviterId)) {
        throw new Error('Only session participants can invite others');
      }

      // Add invitee to session
      if (!session.participants.includes(inviteeId)) {
        session.participants.push(inviteeId);
        await this.redis.storeCollaborationSession(session);
      }

      // Send invitation notification (this would integrate with NotificationService)
      this.io.to(`user:${inviteeId}`).emit('collaboration-invite', {
        sessionId,
        inviterId,
        problemId: session.problemId
      });

      console.log(`User ${inviterId} invited ${inviteeId} to session ${sessionId}`);
    } catch (error) {
      console.error('Error inviting to session:', error);
      throw error;
    }
  }

  async setSessionLanguage(sessionId: string, language: string, userId: string): Promise<void> {
    try {
      const session = await this.redis.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.participants.includes(userId)) {
        throw new Error('User not in session');
      }

      session.language = language;
      await this.redis.storeCollaborationSession(session);

      // Notify all participants of language change
      this.io.to(`collaboration:${sessionId}`).emit('language-changed', {
        sessionId,
        language,
        changedBy: userId
      });
    } catch (error) {
      console.error('Error setting session language:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.redis.getCollaborationSession(sessionId);
      if (!session) {
        return;
      }

      // Only allow session creator (first participant) to delete
      if (session.participants[0] !== userId) {
        throw new Error('Only session creator can delete the session');
      }

      // Notify all participants
      this.io.to(`collaboration:${sessionId}`).emit('session-deleted', {
        sessionId,
        deletedBy: userId
      });

      // Remove from Redis
      await this.redis.getDataClient().del(`collaboration:${sessionId}`);

      console.log(`Session ${sessionId} deleted by ${userId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Operational transform for better conflict resolution (simplified)
  private applyOperationalTransform(
    currentCode: string, 
    operation: any, 
    baseVersion: number, 
    currentVersion: number
  ): string {
    // This is a simplified OT implementation
    // In production, you'd use a proper OT library like ShareJS or Yjs
    
    if (baseVersion === currentVersion) {
      return this.applyOperation(currentCode, operation);
    }
    
    // For now, just return the current code (conflict)
    return currentCode;
  }

  private applyOperation(code: string, operation: any): string {
    // Simplified operation application
    // Real implementation would handle insertions, deletions, etc.
    return operation.newCode || code;
  }
}