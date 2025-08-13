import { Server } from 'socket.io';
import { RoomService } from '../../src/services/RoomService';
import { AuthenticatedSocket, RoomType } from '../../src/types';
import { RedisManager } from '../../src/config/redis';

// Mock Socket.IO
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
  emit: jest.fn(),
  fetchSockets: jest.fn().mockResolvedValue([])
} as unknown as Server;

describe('RoomService', () => {
  let roomService: RoomService;
  let redisManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    roomService = new RoomService(mockIo);
    redisManager = RedisManager.getInstance();
  });

  describe('joinRoom', () => {
    it('should successfully join a room', async () => {
      redisManager.getRoomUsers.mockResolvedValue(['existing-user']);

      await roomService.joinRoom(mockSocket, 'test-room', RoomType.GENERAL);

      expect(mockSocket.join).toHaveBeenCalledWith('test-room');
      expect(redisManager.addUserToRoom).toHaveBeenCalledWith('test-user-id', 'test-room');
      expect(mockSocket.emit).toHaveBeenCalledWith('room-joined', {
        roomId: 'test-room',
        participants: ['existing-user']
      });
    });

    it('should handle unauthenticated user', async () => {
      const unauthSocket = { 
        ...mockSocket, 
        userId: undefined,
        emit: jest.fn()
      };

      await roomService.joinRoom(unauthSocket as unknown as AuthenticatedSocket, 'test-room', RoomType.GENERAL);

      expect(unauthSocket.emit).toHaveBeenCalledWith('error', {
        message: 'User not authenticated'
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      redisManager.addUserToRoom.mockRejectedValue(new Error('Redis error'));

      await roomService.joinRoom(mockSocket, 'test-room', RoomType.GENERAL);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to join room'
      });
    });
  });

  describe('leaveRoom', () => {
    it('should successfully leave a room', async () => {
      await roomService.leaveRoom(mockSocket, 'test-room');

      expect(mockSocket.leave).toHaveBeenCalledWith('test-room');
      expect(redisManager.removeUserFromRoom).toHaveBeenCalledWith('test-user-id', 'test-room');
      expect(mockSocket.emit).toHaveBeenCalledWith('room-left', { roomId: 'test-room' });
    });

    it('should handle unauthenticated user gracefully', async () => {
      const unauthSocket = { 
        ...mockSocket, 
        userId: undefined,
        leave: jest.fn()
      };

      await roomService.leaveRoom(unauthSocket as unknown as AuthenticatedSocket, 'test-room');

      expect(unauthSocket.leave).not.toHaveBeenCalled();
      expect(redisManager.removeUserFromRoom).not.toHaveBeenCalled();
    });
  });

  describe('broadcastToRoom', () => {
    it('should broadcast message to room', async () => {
      const testData = { message: 'Hello room!' };

      await roomService.broadcastToRoom('test-room', 'test-event', testData);

      expect(mockIo.to).toHaveBeenCalledWith('test-room');
      expect(mockIo.emit).toHaveBeenCalledWith('test-event', testData);
    });
  });

  describe('getRoomParticipants', () => {
    it('should return room participants', async () => {
      const participants = ['user1', 'user2', 'user3'];
      redisManager.getRoomUsers.mockResolvedValue(participants);

      const result = await roomService.getRoomParticipants('test-room');

      expect(result).toEqual(participants);
      expect(redisManager.getRoomUsers).toHaveBeenCalledWith('test-room');
    });
  });

  describe('handleTypingStart', () => {
    it('should handle typing start event', async () => {
      await roomService.handleTypingStart(mockSocket, 'test-room');

      expect(mockSocket.to).toHaveBeenCalledWith('test-room');
      expect(redisManager.getDataClient().setEx).toHaveBeenCalledWith(
        'typing:test-room:test-user-id',
        5,
        'typing'
      );
    });

    it('should handle unauthenticated user', async () => {
      const unauthSocket = { 
        ...mockSocket, 
        userId: undefined,
        to: jest.fn().mockReturnThis()
      };

      await roomService.handleTypingStart(unauthSocket as unknown as AuthenticatedSocket, 'test-room');

      expect(redisManager.getDataClient().setEx).not.toHaveBeenCalled();
    });
  });

  describe('handleTypingStop', () => {
    it('should handle typing stop event', async () => {
      await roomService.handleTypingStop(mockSocket, 'test-room');

      expect(redisManager.getDataClient().del).toHaveBeenCalledWith('typing:test-room:test-user-id');
      expect(mockSocket.to).toHaveBeenCalledWith('test-room');
    });
  });
});