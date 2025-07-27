import request from 'supertest';
import express from 'express';
import {
  errorHandlerMiddleware,
  notFoundHandler,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  asyncHandler,
} from '../../src/middleware/error-handler';
import { loggingMiddleware } from '../../src/middleware/logging';

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(loggingMiddleware);
    app.use(express.json());
  });

  describe('Custom Error Classes', () => {
    beforeEach(() => {
      app.get('/api-error', (req, res, next) => {
        next(
          new APIError('Custom API error', 422, 'CUSTOM_ERROR', {
            field: 'test',
          })
        );
      });

      app.get('/validation-error', (req, res, next) => {
        next(
          new ValidationError('Validation failed', {
            field: 'email',
            message: 'Invalid email',
          })
        );
      });

      app.get('/auth-error', (req, res, next) => {
        next(new AuthenticationError());
      });

      app.get('/authz-error', (req, res, next) => {
        next(new AuthorizationError());
      });

      app.get('/not-found-error', (req, res, next) => {
        next(new NotFoundError());
      });

      app.get('/rate-limit-error', (req, res, next) => {
        next(new RateLimitError());
      });

      app.get('/service-error', (req, res, next) => {
        next(new ServiceUnavailableError());
      });

      app.use(errorHandlerMiddleware);
    });

    it('should handle APIError correctly', async () => {
      const response = await request(app).get('/api-error').expect(422);

      expect(response.body.error).toMatchObject({
        code: 'CUSTOM_ERROR',
        message: 'Custom API error',
        details: { field: 'test' },
        timestamp: expect.any(String),
        requestId: expect.any(String),
      });
    });

    it('should handle ValidationError correctly', async () => {
      const response = await request(app).get('/validation-error').expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'email', message: 'Invalid email' },
      });
    });

    it('should handle AuthenticationError correctly', async () => {
      const response = await request(app).get('/auth-error').expect(401);

      expect(response.body.error).toMatchObject({
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      });
    });

    it('should handle AuthorizationError correctly', async () => {
      const response = await request(app).get('/authz-error').expect(403);

      expect(response.body.error).toMatchObject({
        code: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
      });
    });

    it('should handle NotFoundError correctly', async () => {
      const response = await request(app).get('/not-found-error').expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
    });

    it('should handle RateLimitError correctly', async () => {
      const response = await request(app).get('/rate-limit-error').expect(429);

      expect(response.body.error).toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
      });
    });

    it('should handle ServiceUnavailableError correctly', async () => {
      const response = await request(app).get('/service-error').expect(503);

      expect(response.body.error).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
      });
    });
  });

  describe('Built-in Error Handling', () => {
    beforeEach(() => {
      app.get('/generic-error', (req, res, next) => {
        next(new Error('Generic error'));
      });

      app.get('/json-error', (req, res, next) => {
        const error = new SyntaxError('Unexpected token');
        (error as any).body = true;
        next(error);
      });

      app.get('/jwt-error', (req, res, next) => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        next(error);
      });

      app.get('/jwt-expired', (req, res, next) => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        next(error);
      });

      app.use(errorHandlerMiddleware);
    });

    it('should handle generic errors as internal server error', async () => {
      const response = await request(app).get('/generic-error').expect(500);

      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    });

    it('should handle JSON syntax errors', async () => {
      const response = await request(app).get('/json-error').expect(400);

      expect(response.body.error).toMatchObject({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      });
    });

    it('should handle JWT errors', async () => {
      const response = await request(app).get('/jwt-error').expect(401);

      expect(response.body.error).toMatchObject({
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      });
    });

    it('should handle JWT expiration errors', async () => {
      const response = await request(app).get('/jwt-expired').expect(401);

      expect(response.body.error).toMatchObject({
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token expired',
      });
    });
  });

  describe('Not Found Handler', () => {
    beforeEach(() => {
      app.get('/existing', (req, res) => res.json({ message: 'exists' }));
      app.use(notFoundHandler);
      app.use(errorHandlerMiddleware);
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent').expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Route GET /non-existent not found',
      });
    });

    it('should not interfere with existing routes', async () => {
      const response = await request(app).get('/existing').expect(200);

      expect(response.body.message).toBe('exists');
    });
  });

  describe('Async Handler', () => {
    beforeEach(() => {
      app.get(
        '/async-success',
        asyncHandler(async (req, res) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          res.json({ message: 'success' });
        })
      );

      app.get(
        '/async-error',
        asyncHandler(async (req, res) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new ValidationError('Async validation error');
        })
      );

      app.use(errorHandlerMiddleware);
    });

    it('should handle successful async operations', async () => {
      const response = await request(app).get('/async-success').expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should catch async errors', async () => {
      const response = await request(app).get('/async-error').expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Async validation error',
      });
    });
  });

  describe('Response Headers Sent', () => {
    beforeEach(() => {
      app.get('/headers-sent', (req, res, next) => {
        res.status(200).json({ message: 'sent' });
        next(new Error('Error after response sent'));
      });

      app.use(errorHandlerMiddleware);
    });

    it('should not interfere if headers already sent', async () => {
      const response = await request(app).get('/headers-sent').expect(200);

      expect(response.body.message).toBe('sent');
    });
  });

  describe('Error Response Format', () => {
    beforeEach(() => {
      app.get('/test-error', (req, res, next) => {
        next(new ValidationError('Test error', { field: 'test' }));
      });

      app.use(errorHandlerMiddleware);
    });

    it('should include all required fields in error response', async () => {
      const response = await request(app).get('/test-error').expect(400);

      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('details');

      expect(response.body.error.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
});
