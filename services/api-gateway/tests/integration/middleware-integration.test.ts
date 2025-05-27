import request from 'supertest';
import express from 'express';
import { setupMiddleware } from '../../src/middleware';
import { setupRoutes } from '../../src/routes';

// Mock Redis and external dependencies
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK')
  }));
});

jest.mock('rate-limit-redis', () => {
  return jest.fn().mockImplementation(() => ({
    incr: jest.fn().mockResolvedValue(1),
    decrement: jest.fn().mockResolvedValue(0),
    resetKey: jest.fn().mockResolvedValue(undefined)
  }));
});

describe('Middleware Integration', () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    await setupMiddleware(app);
    setupRoutes(app);
  });

  it('should apply all middleware in correct order', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    // Check that security headers are set
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    
    // Check that CORS headers are set
    expect(response.headers['access-control-allow-origin']).toBeDefined();
    
    // Check that request ID is set
    expect(response.headers['x-request-id']).toBeDefined();
    
    // Check that API version is set
    expect(response.headers['x-api-version']).toBe('1.0');
    
    // Check that rate limit headers are set
    expect(response.headers['ratelimit-limit']).toBeDefined();
  });

  it('should handle JSON parsing', async () => {
    const testData = { message: 'test' };
    
    // Add a test endpoint that echoes the request body
    app.post('/echo', (req, res) => res.json(req.body));
    
    const response = await request(app)
      .post('/echo')
      .send(testData)
      .expect(200);

    expect(response.body).toEqual(testData);
  });

  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/test')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}')
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('should handle large request bodies within limit', async () => {
    const largeData = { data: 'x'.repeat(1000000) }; // 1MB of data
    
    app.post('/large', (req, res) => res.json({ size: JSON.stringify(req.body).length }));
    
    const response = await request(app)
      .post('/large')
      .send(largeData)
      .expect(200);

    expect(response.body.size).toBeGreaterThan(1000000);
  });

  it('should reject request bodies exceeding limit', async () => {
    const tooLargeData = { data: 'x'.repeat(11000000) }; // 11MB of data
    
    app.post('/toolarge', (req, res) => res.json(req.body));
    
    await request(app)
      .post('/toolarge')
      .send(tooLargeData)
      .expect(413);
  });

  it('should handle CORS preflight requests', async () => {
    const response = await request(app)
      .options('/api/test')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
  });

  it('should track metrics across requests', async () => {
    // Make several requests
    await request(app).get('/health').expect(200);
    await request(app).get('/metrics').expect(200);
    await request(app).get('/nonexistent').expect(404);
    
    const metricsResponse = await request(app)
      .get('/metrics')
      .expect(200);

    expect(metricsResponse.body.requests.total).toBeGreaterThan(0);
    expect(metricsResponse.body.requests.byMethod.GET).toBeGreaterThan(0);
    expect(metricsResponse.body.requests.byStatus['200']).toBeGreaterThan(0);
    expect(metricsResponse.body.requests.byStatus['404']).toBeGreaterThan(0);
  });

  it('should handle authentication flow', async () => {
    // Test unauthenticated request to protected endpoint
    const unauthResponse = await request(app)
      .get('/api/users/profile')
      .expect(401);

    expect(unauthResponse.body.error.code).toBe('MISSING_TOKEN');
  });

  it('should handle errors consistently', async () => {
    // Test 404 error
    const notFoundResponse = await request(app)
      .get('/nonexistent')
      .expect(404);

    expect(notFoundResponse.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('Route GET /nonexistent not found'),
      timestamp: expect.any(String),
      requestId: expect.any(String)
    });
  });

  it('should maintain request context across middleware', async () => {
    // Add a test endpoint that checks request context
    app.get('/context', (req, res) => {
      res.json({
        hasRequestId: !!req.requestId,
        hasStartTime: !!req.startTime,
        requestId: req.requestId
      });
    });

    const response = await request(app)
      .get('/context')
      .expect(200);

    expect(response.body.hasRequestId).toBe(true);
    expect(response.body.hasStartTime).toBe(true);
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('should handle URL encoding', async () => {
    app.get('/encoded/:param', (req, res) => {
      res.json({ param: req.params.param, query: req.query });
    });

    const response = await request(app)
      .get('/encoded/hello%20world?name=test%20user')
      .expect(200);

    expect(response.body.param).toBe('hello world');
    expect(response.body.query.name).toBe('test user');
  });

  it('should set appropriate cache headers for different endpoints', async () => {
    // Health endpoint should not have cache control
    const healthResponse = await request(app)
      .get('/health')
      .expect(200);

    expect(healthResponse.headers['cache-control']).toBeUndefined();

    // Auth endpoints should have no-cache headers
    app.get('/auth/test', (req, res) => res.json({ test: true }));
    
    const authResponse = await request(app)
      .get('/auth/test')
      .expect(200);

    expect(authResponse.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
  });
});