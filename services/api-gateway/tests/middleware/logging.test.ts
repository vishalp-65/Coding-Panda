import request from 'supertest';
import express from 'express';
import { loggingMiddleware } from '../../src/middleware/logging';
import { logger } from '@ai-platform/common';

describe('Logging Middleware', () => {
  let app: express.Application;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    app = express();
    app.use(loggingMiddleware);
    app.get('/test', (req, res) => res.json({ message: 'test' }));
    app.get('/slow', (req, res) => {
      setTimeout(() => res.json({ message: 'slow' }), 100);
    });

    jest.clearAllMocks();
  });

  it('should generate and set request ID', async () => {
    const response = await request(app).get('/test').expect(200);

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should use provided request ID from header', async () => {
    const customRequestId = 'custom-request-id-123';

    const response = await request(app)
      .get('/test')
      .set('X-Request-ID', customRequestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(customRequestId);
  });

  it('should log incoming requests', async () => {
    await request(app).get('/test').expect(200);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        requestId: expect.any(String),
      })
    );
  });

  it('should log outgoing responses', async () => {
    await request(app).get('/test').expect(200);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        statusCode: 200,
        duration: expect.any(Number),
        requestId: expect.any(String),
      })
    );
  });

  it('should redact authorization header in logs', async () => {
    await request(app)
      .get('/test')
      .set('Authorization', 'Bearer secret-token')
      .expect(200);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: '[REDACTED]',
        }),
      })
    );
  });

  it('should measure request duration', async () => {
    await request(app).get('/test').expect(200);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        duration: expect.any(Number),
      })
    );

    const logCall = mockLogger.info.mock.calls.find(
      (call: any) => call[0] === 'Outgoing response'
    );
    expect(logCall).toBeDefined();
    expect((logCall as any)[1].duration).toBeGreaterThan(0);
  });

  it('should attach requestId to request object', async () => {
    app.get('/check-request-id', (req, res) => {
      expect(req.requestId).toBeDefined();
      expect(req.startTime).toBeDefined();
      res.json({ requestId: req.requestId });
    });

    const response = await request(app).get('/check-request-id').expect(200);

    expect(response.body.requestId).toBeDefined();
  });
});
