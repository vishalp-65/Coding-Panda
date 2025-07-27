import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { serviceRoutes } from '../../src/routes/services';
import { loggingMiddleware } from '../../src/middleware/logging';

// Mock http-proxy-middleware
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn(() => (req: any, res: any, next: any) => {
    // Simulate successful proxy response
    res.json({ proxied: true, service: req.path.split('/')[1] });
  }),
}));

// Mock Redis client
jest.mock('../../src/middleware/rate-limit', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
  },
}));

describe('Service Routes', () => {
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

  const createToken = (payload: any) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(loggingMiddleware);
    app.use('/api', serviceRoutes);
    jest.clearAllMocks();
  });

  describe('Public endpoints', () => {
    it('should allow access to user endpoints without authentication', async () => {
      const response = await request(app).get('/api/users/public').expect(200);

      expect(response.body.proxied).toBe(true);
      expect(response.body.service).toBe('users');
    });

    it('should allow access to problem browsing without authentication', async () => {
      const response = await request(app).get('/api/problems').expect(200);

      expect(response.body.proxied).toBe(true);
      expect(response.body.service).toBe('problems');
    });

    it('should allow access to contest viewing without authentication', async () => {
      const response = await request(app).get('/api/contests').expect(200);

      expect(response.body.proxied).toBe(true);
      expect(response.body.service).toBe('contests');
    });
  });

  describe('Protected endpoints', () => {
    it('should require authentication for code execution', async () => {
      const response = await request(app)
        .post('/api/execute')
        .send({ code: 'console.log("hello")', language: 'javascript' })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should allow authenticated access to code execution', async () => {
      const token = createToken(validUser);

      const response = await request(app)
        .post('/api/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'console.log("hello")', language: 'javascript' })
        .expect(200);

      expect(response.body.proxied).toBe(true);
      expect(response.body.service).toBe('execute');
    });

    it('should require authentication for AI services', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .send({ code: 'def hello(): pass', language: 'python' })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should allow authenticated access to AI services', async () => {
      const token = createToken(validUser);

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'def hello(): pass', language: 'python' })
        .expect(200);

      expect(response.body.proxied).toBe(true);
      expect(response.body.service).toBe('ai');
    });
  });

  describe('Role-based access control', () => {
    it('should require admin role for admin endpoints', async () => {
      const token = createToken(validUser);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow admin access to admin endpoints', async () => {
      const token = createToken(adminUser);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.proxied).toBe(true);
    });

    it('should allow admin and moderator access to moderate endpoints', async () => {
      const moderatorUser = {
        id: 'mod-123',
        email: 'mod@example.com',
        username: 'moderator',
        roles: ['moderator', 'user'],
      };

      const token = createToken(moderatorUser);

      const response = await request(app)
        .get('/api/moderate/reports')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.proxied).toBe(true);
    });
  });

  describe('Request forwarding', () => {
    it('should forward user information in headers when authenticated', async () => {
      const token = createToken(validUser);

      // Mock the proxy to capture forwarded headers
      const captureHeadersProxy = jest.fn((req, res, next) => {
        res.json({
          proxied: true,
          forwardedHeaders: {
            'x-user-id': req.headers['x-user-id'],
            'x-user-email': req.headers['x-user-email'],
            'x-user-roles': req.headers['x-user-roles'],
            'x-request-id': req.headers['x-request-id'],
            'x-real-ip': req.headers['x-real-ip'],
          },
        });
      });

      // Replace the mock temporarily
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware.mockImplementationOnce(() => captureHeadersProxy);

      // Create new app with updated mock
      const testApp = express();
      testApp.use(express.json());
      testApp.use(loggingMiddleware);
      testApp.use('/api', serviceRoutes);

      const response = await request(testApp)
        .post('/api/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'test' })
        .expect(200);

      expect(response.body.forwardedHeaders['x-user-id']).toBe(validUser.id);
      expect(response.body.forwardedHeaders['x-user-email']).toBe(
        validUser.email
      );
      expect(response.body.forwardedHeaders['x-user-roles']).toBe(
        JSON.stringify(validUser.roles)
      );
      expect(response.body.forwardedHeaders['x-request-id']).toBeDefined();
      expect(response.body.forwardedHeaders['x-real-ip']).toBeDefined();
    });

    it('should not forward user headers when not authenticated', async () => {
      const captureHeadersProxy = jest.fn((req, res, next) => {
        res.json({
          proxied: true,
          hasUserHeaders: !!(
            req.headers['x-user-id'] || req.headers['x-user-email']
          ),
        });
      });

      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware.mockImplementationOnce(() => captureHeadersProxy);

      const testApp = express();
      testApp.use(express.json());
      testApp.use(loggingMiddleware);
      testApp.use('/api', serviceRoutes);

      const response = await request(testApp).get('/api/problems').expect(200);

      expect(response.body.hasUserHeaders).toBe(false);
    });
  });

  describe('Service discovery configuration', () => {
    it('should route to correct services based on path', async () => {
      const services = [
        { path: '/api/users', expectedService: 'users' },
        { path: '/api/problems', expectedService: 'problems' },
        { path: '/api/contests', expectedService: 'contests' },
      ];

      for (const service of services) {
        const response = await request(app).get(service.path).expect(200);

        expect(response.body.service).toBe(service.expectedService);
      }
    });

    it('should handle nested paths correctly', async () => {
      const response = await request(app)
        .get('/api/problems/123/solutions')
        .expect(200);

      expect(response.body.service).toBe('problems');
    });
  });

  describe('Error handling', () => {
    it('should handle proxy errors gracefully', async () => {
      // Mock proxy to throw error
      const errorProxy = jest.fn((req, res, next) => {
        const error = new Error('Service unavailable');
        // Simulate proxy error handling
        res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable',
            service: req.path.split('/')[1],
            timestamp: expect.any(String),
            requestId: req.requestId,
          },
        });
      });

      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware.mockImplementationOnce(() => errorProxy);

      const testApp = express();
      testApp.use(express.json());
      testApp.use(loggingMiddleware);
      testApp.use('/api', serviceRoutes);

      const response = await request(testApp).get('/api/problems').expect(503);

      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(response.body.error.service).toBe('problems');
    });
  });
});
