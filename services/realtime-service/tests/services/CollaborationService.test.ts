import { Server } from 'socket.io';
import { CollaborationService } from '../../src/services/CollaborationService';
import { AuthenticatedSocket } from '../../src/types';
import { RedisManager } from '../../src/config/redis';

const mockSocket = {
  userId: 'test-user-id',
  username: 'testuser',
  roles: ['user'],
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis()
} as unknown as AuthenticatedSocket;

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as Server;

describe('CollaborationService', () => {
  let collaborationService: CollaborationService;
  let redisManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    collaborationService = new CollaborationService(mockIo);
    redisManager = RedisManager.getInstance();
  });

  describe('createSession', () => {
    it('should create a new collaboration session', async () => {
      const creatorId = 'user-123';
      const problemId = 'problem-456';
      const language = 'python';

      const session = await collaborationService.createSession(creatorId, problemId, language);

      expect(session).toMatchObject({
        id: expect.any(String),
        problemId,
        participants: [creatorId],
        sharedCode: '',
        language,
        cursors: {},
        lastModified: expect.any(Date),
        version: 0
      });

      expect(redisManager.storeCollaborationSession).toHaveBeenCalledWith(session);
    });

    it('should create session with default language', async () => {
      const creatorId = 'user-123';

      const session = await collaborationService.createSession(creatorId);

      expect(session.language).toBe('javascript');
      expect(session.problemId).toBeUndefined();
    });
  });

  describe('joinSession', () => {
    it('should join existing session', async () => {
      const sessionId = 'session-123';
      const existingSession = {
        id: sessionId,
        participants: ['other-user'],
        sharedCode: 'console.log("hello");',
        language: 'javascript',
        cursors: {},
        lastModified: new Date(),
        version: 1
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await collaborationService.joinSession(mockSocket, sessionId);

      expect(mockSocket.join).toHaveBeenCalledWith(`collaboration:${sessionId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('collaboration-session-joined', {
        sessionId,
        code: existingSession.sharedCode,
        language: existingSession.language,
        participants: ['other-user', 'test-user-id'],
        cursors: existingSession.cursors,
        version: existingSession.version
      });
    });

    it('should handle non-existent session', async () => {
      redisManager.getCollaborationSession.mockResolvedValue(null);

      await collaborationService.joinSession(mockSocket, 'non-existent');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Collaboration session not found'
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated user', async () => {
      const unauthSocket = { 
        ...mockSocket, 
        userId: undefined,
        emit: jest.fn()
      };

      await collaborationService.joinSession(unauthSocket as unknown as AuthenticatedSocket, 'session-123');

      expect(unauthSocket.emit).toHaveBeenCalledWith('error', {
        message: 'User not authenticated'
      });
    });
  });

  describe('handleCodeChange', () => {
    it('should handle valid code change', async () => {
      const sessionId = 'session-123';
      const newCode = 'console.log("updated");';
      const version = 1;
      const existingSession = {
        id: sessionId,
        participants: ['test-user-id'],
        sharedCode: 'console.log("old");',
        language: 'javascript',
        cursors: {},
        lastModified: new Date(),
        version: 1
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await collaborationService.handleCodeChange(mockSocket, sessionId, newCode, version);

      expect(redisManager.storeCollaborationSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sharedCode: newCode,
          version: 2,
          lastModified: expect.any(Date)
        })
      );

      expect(mockSocket.to).toHaveBeenCalledWith(`collaboration:${sessionId}`);
    });

    it('should handle version conflict', async () => {
      const sessionId = 'session-123';
      const newCode = 'console.log("conflict");';
      const oldVersion = 1;
      const existingSession = {
        id: sessionId,
        participants: ['test-user-id'],
        sharedCode: 'console.log("current");',
        language: 'javascript',
        cursors: {},
        lastModified: new Date(),
        version: 3 // Higher version indicates conflict
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await collaborationService.handleCodeChange(mockSocket, sessionId, newCode, oldVersion);

      expect(mockSocket.emit).toHaveBeenCalledWith('collaboration-conflict', {
        sessionId,
        conflictVersion: oldVersion,
        currentVersion: existingSession.version,
        currentCode: existingSession.sharedCode
      });

      expect(redisManager.storeCollaborationSession).not.toHaveBeenCalled();
    });
  });

  describe('handleCursorMove', () => {
    it('should handle cursor movement', async () => {
      const sessionId = 'session-123';
      const position = {
        userId: 'test-user-id',
        line: 5,
        column: 10
      };
      const existingSession = {
        id: sessionId,
        participants: ['test-user-id'],
        sharedCode: '',
        language: 'javascript',
        cursors: {},
        lastModified: new Date(),
        version: 1
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await collaborationService.handleCursorMove(mockSocket, sessionId, position);

      expect(redisManager.storeCollaborationSession).toHaveBeenCalledWith(
        expect.objectContaining({
          cursors: {
            'test-user-id': position
          }
        })
      );

      expect(mockSocket.to).toHaveBeenCalledWith(`collaboration:${sessionId}`);
    });

    it('should handle non-existent session gracefully', async () => {
      redisManager.getCollaborationSession.mockResolvedValue(null);

      const position = { userId: 'test-user-id', line: 1, column: 1 };
      await collaborationService.handleCursorMove(mockSocket, 'non-existent', position);

      expect(redisManager.storeCollaborationSession).not.toHaveBeenCalled();
    });
  });

  describe('leaveSession', () => {
    it('should leave collaboration session', async () => {
      const sessionId = 'session-123';
      const existingSession = {
        id: sessionId,
        participants: ['test-user-id', 'other-user'],
        sharedCode: '',
        language: 'javascript',
        cursors: { 'test-user-id': { userId: 'test-user-id', line: 1, column: 1 } },
        lastModified: new Date(),
        version: 1
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await collaborationService.leaveSession(mockSocket, sessionId);

      expect(mockSocket.leave).toHaveBeenCalledWith(`collaboration:${sessionId}`);
      expect(redisManager.storeCollaborationSession).toHaveBeenCalledWith(
        expect.objectContaining({
          participants: ['other-user'],
          cursors: {}
        })
      );
    });
  });

  describe('inviteToSession', () => {
    it('should invite user to session', async () => {
      const sessionId = 'session-123';
      const inviterId = 'inviter-id';
      const inviteeId = 'invitee-id';
      const existingSession = {
        id: sessionId,
        participants: [inviterId],
        sharedCode: '',
        language: 'javascript',
        cursors: {},
        lastModified: new Date(),
        version: 1
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await collaborationService.inviteToSession(sessionId, inviterId, inviteeId);

      expect(redisManager.storeCollaborationSession).toHaveBeenCalledWith(
        expect.objectContaining({
          participants: [inviterId, inviteeId]
        })
      );

      expect(mockIo.to).toHaveBeenCalledWith(`user:${inviteeId}`);
    });

    it('should reject invitation from non-participant', async () => {
      const sessionId = 'session-123';
      const inviterId = 'non-participant';
      const inviteeId = 'invitee-id';
      const existingSession = {
        id: sessionId,
        participants: ['other-user'],
        sharedCode: '',
        language: 'javascript',
        cursors: {},
        lastModified: new Date(),
        version: 1
      };

      redisManager.getCollaborationSession.mockResolvedValue(existingSession);

      await expect(
        collaborationService.inviteToSession(sessionId, inviterId, inviteeId)
      ).rejects.toThrow('Only session participants can invite others');
    });
  });
});