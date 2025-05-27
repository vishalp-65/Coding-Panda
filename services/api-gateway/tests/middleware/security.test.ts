import request from 'supertest';
import express from 'express';
import { securityMiddleware, additionalSecurityMiddleware } from '../../src/middleware/security';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(securityMiddleware);
    app.use(additionalSecurityMiddleware);
    app.get('/test', (req, res) => res.json({ message: 'test' }));
    app.get('/auth/login', (req, res) => res.json({ message: 'auth' }));
  });

  it('should set security headers', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('should remove X-Powered-By header', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should set custom API headers', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-api-version']).toBe('1.0');
  });

  it('should set no-cache headers for auth endpoints', async () => {
    const response = await request(app)
      .get('/auth/login')
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
    expect(response.headers['pragma']).toBe('no-cache');
    expect(response.headers['expires']).toBe('0');
  });

  it('should set CSP headers', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('should set referrer policy', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});