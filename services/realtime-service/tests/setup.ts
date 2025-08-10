import { RedisManager } from '../src/config/redis';

// Mock Redis for testing
jest.mock('../src/config/redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    sAdd: jest.fn().mockResolvedValue(1),
    sRem: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    hSet: jest.fn().mockResolvedValue(1),
    hGetAll: jest.fn().mockResolvedValue({}),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    lPush: jest.fn().mockResolvedValue(1),
    lRange: jest.fn().mockResolvedValue([]),
    lTrim: jest.fn().mockResolvedValue('OK'),
    zAdd: jest.fn().mockResolvedValue(1),
    zRangeWithScores: jest.fn().mockResolvedValue([]),
    keys: jest.fn().mockResolvedValue([]),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null)
  };

  return {
    RedisManager: {
      getInstance: jest.fn(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        getAdapter: jest.fn().mockReturnValue({}),
        getDataClient: jest.fn().mockReturnValue(mockRedisClient),
        addUserToRoom: jest.fn().mockResolvedValue(undefined),
        removeUserFromRoom: jest.fn().mockResolvedValue(undefined),
        getRoomUsers: jest.fn().mockResolvedValue([]),
        getUserRooms: jest.fn().mockResolvedValue([]),
        storeNotification: jest.fn().mockResolvedValue(undefined),
        getUserNotifications: jest.fn().mockResolvedValue([]),
        storeCollaborationSession: jest.fn().mockResolvedValue(undefined),
        getCollaborationSession: jest.fn().mockResolvedValue(null),
        storeChatMessage: jest.fn().mockResolvedValue(undefined),
        getChatMessages: jest.fn().mockResolvedValue([]),
        updateLeaderboard: jest.fn().mockResolvedValue(undefined),
        getLeaderboard: jest.fn().mockResolvedValue([]),
        disconnect: jest.fn().mockResolvedValue(undefined)
      }))
    }
  };
});

// Mock JWT
const mockJwt = {
  sign: jest.fn().mockImplementation((payload, secret) => `mock-token-${JSON.stringify(payload)}`),
  verify: jest.fn(),
  JsonWebTokenError: class extends Error {},
  TokenExpiredError: class extends Error {}
};

jest.mock('jsonwebtoken', () => mockJwt);

// Set up default JWT verify behavior
beforeEach(() => {
  mockJwt.verify.mockReturnValue({
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user']
  });
});

// Set test environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';