import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
} from '../../src/middleware/auth';

// Mock Redis client
jest.mock('../../src/middleware/rate-limit', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
  },
}));

describe('Auth Middleware', () => {
  let app: express.Application;
  const JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

  const validUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    roles: ['user'],
  };

  const adminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    username: 'admin',
    roles: ['admin', 'user'],
  };

  const createToken = (payload: any, expiresIn: string = '1h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('authMiddleware', () => {
    beforeEach(() => {
      app.use(authMiddleware);
      app.get('/protected', (req, res) => {
        res.json({ user: req.user });
      });
    });

    it('should reject requests without token', async () => {
      const response = await request(app).get('/protected').expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should accept requests with valid token', async () => {
      const token = createToken(validUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toEqual(validUser);
    });

    it('should accept token from query parameter', async () => {
      const token = createToken(validUser);

      const response = await request(app)
        .get('/protected')
        .query({ token })
        .expect(200);

      expect(response.body.user).toEqual(validUser);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = createToken(validUser, '-1h');

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('optionalAuthMiddleware', () => {
    beforeEach(() => {
      app.use(optionalAuthMiddleware);
      app.get('/optional', (req, res) => {
        res.json({ user: req.user || null });
      });
    });

    it('should allow requests without token', async () => {
      const response = await request(app).get('/optional').expect(200);

      expect(response.body.user).toBeNull();
    });

    it('should attach user if valid token provided', async () => {
      const token = createToken(validUser);

      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toEqual(validUser);
    });

    it('should continue without user if invalid token provided', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.user).toBeNull();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      app.use(authMiddleware);
    });

    it('should allow access with required role', async () => {
      app.get('/admin', requireRole('admin'), (req, res) => {
        res.json({ success: true });
      });

      const token = createToken(adminUser);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access without required role', async () => {
      app.get('/admin', requireRole('admin'), (req, res) => {
        res.json({ success: true });
      });

      const token = createToken(validUser);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow access with any of multiple required roles', async () => {
      app.get('/moderate', requireRole(['admin', 'moderator']), (req, res) => {
        res.json({ success: true });
      });

      const token = createToken(adminUser);

      const response = await request(app)
        .get('/moderate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication before checking roles', async () => {
      app.get('/admin', requireRole('admin'), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/admin').expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});
