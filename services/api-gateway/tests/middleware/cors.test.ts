import request from 'supertest';
import express from 'express';
import { corsMiddleware } from '../../src/middleware/cors';

describe('CORS Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(corsMiddleware);
    app.get('/test', (req, res) => res.json({ message: 'test' }));
  });

  it('should allow requests with no origin', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should handle preflight OPTIONS requests', async () => {
    const response = await request(app)
      .options('/test')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
  });

  it('should expose required headers', async () => {
    const response = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-expose-headers']).toContain('X-Request-ID');
    expect(response.headers['access-control-expose-headers']).toContain('X-Rate-Limit-Remaining');
  });

  it('should set max age for preflight cache', async () => {
    const response = await request(app)
      .options('/test')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-max-age']).toBe('86400');
  });

  it('should allow credentials', async () => {
    const response = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});