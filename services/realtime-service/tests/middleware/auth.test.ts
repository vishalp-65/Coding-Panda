import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { authenticateSocket, validateRoomAccess, requireRole } from '../../src/middleware/auth';
import { AuthenticatedSocket } from '../../src/types';

// Mock socket object
const createMockSocket = (authToken?: string, userId?: string, roles?: string[]) => {
  const socket = {
    handshake: {
      auth: authToken ? { token: authToken } : {},
      headers: {}
    },
    userId,
    username: 'testuser',
    roles
  } as unknown as Socket;

  return socket;
};

describe('Authentication Middleware', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let mockJwt: any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    mockJwt = require('jsonwebtoken');
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateSocket', () => {
    it('should authenticate with valid token in auth object', (done) => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      };

      mockJwt.verify.mockReturnValue(payload);
      const token = mockJwt.sign(payload, process.env.JWT_SECRET!);
      const socket = createMockSocket(token);

      authenticateSocket(socket, (error) => {
        expect(error).toBeUndefined();
        
        const authSocket = socket as AuthenticatedSocket;
        expect(authSocket.userId).toBe(payload.userId);
        expect(authSocket.username).toBe(payload.username);
        expect(authSocket.roles).toEqual(payload.roles);
        
        done();
      });
    });

    it('should authenticate with valid token in authorization header', (done) => {
      const payload = {
        userId: 'user-456',
        username: 'headeruser',
        email: 'header@example.com',
        roles: ['admin']
      };

      mockJwt.verify.mockReturnValue(payload);
      const token = mockJwt.sign(payload, process.env.JWT_SECRET!);
      const socket = {
        handshake: {
          auth: {},
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      } as unknown as Socket;

      authenticateSocket(socket, (error) => {
        expect(error).toBeUndefined();
        
        const authSocket = socket as AuthenticatedSocket;
        expect(authSocket.userId).toBe(payload.userId);
        expect(authSocket.username).toBe(payload.username);
        expect(authSocket.roles).toEqual(payload.roles);
        
        done();
      });
    });

    it('should reject connection without token', (done) => {
      const socket = createMockSocket();

      authenticateSocket(socket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toBe('Authentication token required');
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.JsonWebTokenError('invalid token');
      });
      
      const socket = createMockSocket('invalid-token');

      authenticateSocket(socket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toBe('Invalid authentication token');
        done();
      });
    });

    it('should reject connection with expired token', (done) => {
      mockJwt.verify.mockImplementation(() => {
        throw new mockJwt.TokenExpiredError('jwt expired', new Date());
      });
      
      const socket = createMockSocket('expired-token');

      authenticateSocket(socket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toBe('Authentication token expired');
        done();
      });
    });

    it('should handle missing JWT secret', (done) => {
      delete process.env.JWT_SECRET;
      
      const token = mockJwt.sign({ userId: 'test' }, 'any-secret');
      const socket = createMockSocket(token);

      authenticateSocket(socket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toBe('JWT secret not configured');
        
        // Restore JWT secret
        process.env.JWT_SECRET = 'test-secret-key';
        done();
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access with required role', (done) => {
      const socket = createMockSocket(undefined, 'user-123', ['admin', 'user']);
      const middleware = requireRole(['admin']);

      middleware(socket as AuthenticatedSocket, (error) => {
        expect(error).toBeUndefined();
        done();
      });
    });

    it('should allow access with any of the required roles', (done) => {
      const socket = createMockSocket(undefined, 'user-123', ['moderator']);
      const middleware = requireRole(['admin', 'moderator']);

      middleware(socket as AuthenticatedSocket, (error) => {
        expect(error).toBeUndefined();
        done();
      });
    });

    it('should deny access without required role', (done) => {
      const socket = createMockSocket(undefined, 'user-123', ['user']);
      const middleware = requireRole(['admin']);

      middleware(socket as AuthenticatedSocket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toContain('Access denied');
        expect(error!.message).toContain('admin');
        done();
      });
    });

    it('should deny access with no roles', (done) => {
      const socket = createMockSocket(undefined, 'user-123', []);
      const middleware = requireRole(['admin']);

      middleware(socket as AuthenticatedSocket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toContain('Access denied');
        done();
      });
    });

    it('should deny access with undefined roles', (done) => {
      const socket = createMockSocket(undefined, 'user-123', undefined);
      const middleware = requireRole(['admin']);

      middleware(socket as AuthenticatedSocket, (error) => {
        expect(error).toBeDefined();
        expect(error!.message).toContain('Access denied');
        done();
      });
    });
  });

  describe('validateRoomAccess', () => {
    it('should allow access for authenticated user to general room', async () => {
      const socket = createMockSocket(undefined, 'user-123', ['user']) as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'general-room', 'general');
      
      expect(hasAccess).toBe(true);
    });

    it('should allow access to discussion room', async () => {
      const socket = createMockSocket(undefined, 'user-123', ['user']) as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'discussion-room', 'discussion');
      
      expect(hasAccess).toBe(true);
    });

    it('should allow access to contest room (placeholder implementation)', async () => {
      const socket = createMockSocket(undefined, 'user-123', ['user']) as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'contest-123', 'contest');
      
      expect(hasAccess).toBe(true); // Currently returns true as placeholder
    });

    it('should deny access for unauthenticated user', async () => {
      const socket = createMockSocket() as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'any-room', 'general');
      
      expect(hasAccess).toBe(false);
    });

    it('should allow access to collaboration room (placeholder implementation)', async () => {
      const socket = createMockSocket(undefined, 'user-123', ['user']) as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'collab-456', 'collaboration');
      
      expect(hasAccess).toBe(true); // Currently returns true as placeholder
    });

    it('should allow access to interview room (placeholder implementation)', async () => {
      const socket = createMockSocket(undefined, 'user-123', ['user']) as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'interview-789', 'interview');
      
      expect(hasAccess).toBe(true); // Currently returns true as placeholder
    });

    it('should handle unknown room types', async () => {
      const socket = createMockSocket(undefined, 'user-123', ['user']) as AuthenticatedSocket;
      
      const hasAccess = await validateRoomAccess(socket, 'unknown-room', 'unknown' as any);
      
      expect(hasAccess).toBe(true); // Default case returns true
    });
  });
});