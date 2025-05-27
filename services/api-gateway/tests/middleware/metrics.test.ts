import request from 'supertest';
import express from 'express';
import { metricsMiddleware, getMetrics, getHealth, resetMetrics, metrics } from '../../src/middleware/metrics';

describe('Metrics Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMetrics();
    app = express();
    app.use(metricsMiddleware);
    app.get('/test', (req, res) => res.json({ message: 'test' }));
    app.get('/error', (req, res) => res.status(500).json({ error: 'test error' }));
    app.get('/slow', (req, res) => {
      setTimeout(() => res.json({ message: 'slow' }), 100);
    });
    app.get('/metrics', getMetrics);
    app.get('/health', getHealth);
  });

  it('should track request counts', async () => {
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);
    await request(app).post('/test').expect(404);

    expect(metrics.requests.total).toBe(3);
    expect(metrics.requests.byMethod.GET).toBe(2);
    expect(metrics.requests.byMethod.POST).toBe(1);
  });

  it('should track response status codes', async () => {
    await request(app).get('/test').expect(200);
    await request(app).get('/error').expect(500);
    await request(app).get('/nonexistent').expect(404);

    expect(metrics.requests.byStatus['200']).toBe(1);
    expect(metrics.requests.byStatus['500']).toBe(1);
    expect(metrics.requests.byStatus['404']).toBe(1);
  });

  it('should track response times', async () => {
    await request(app).get('/test').expect(200);
    
    expect(metrics.responseTime.count).toBe(1);
    expect(metrics.responseTime.average).toBeGreaterThan(0);
    expect(metrics.responseTime.min).toBeGreaterThan(0);
    expect(metrics.responseTime.max).toBeGreaterThan(0);
  });

  it('should track error counts', async () => {
    await request(app).get('/error').expect(500);
    await request(app).get('/nonexistent').expect(404);

    expect(metrics.errors.total).toBe(2);
    expect(metrics.errors.byType.server_error).toBe(1);
    expect(metrics.errors.byType.client_error).toBe(1);
  });

  it('should track active connections', async () => {
    const initialConnections = metrics.activeConnections;
    
    const promise1 = request(app).get('/slow');
    const promise2 = request(app).get('/slow');
    
    // Small delay to let middleware increment counters
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(metrics.activeConnections).toBeGreaterThan(initialConnections);
    
    await Promise.all([promise1, promise2]);
    
    // Connections should be decremented after response
    expect(metrics.activeConnections).toBe(initialConnections);
  });

  it('should normalize route patterns', async () => {
    // Test UUID normalization
    await request(app).get('/users/123e4567-e89b-12d3-a456-426614174000').expect(404);
    
    // Test numeric ID normalization
    await request(app).get('/users/123').expect(404);
    
    expect(metrics.requests.byRoute['/users/:id']).toBe(2);
  });

  describe('metrics endpoint', () => {
    it('should return current metrics', async () => {
      await request(app).get('/test').expect(200);
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('activeConnections');
      
      expect(response.body.requests.total).toBeGreaterThan(0);
    });

    it('should include memory usage information', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('external');
    });
  });

  describe('health endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial state', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/error').expect(500);
      
      expect(metrics.requests.total).toBeGreaterThan(0);
      expect(metrics.errors.total).toBeGreaterThan(0);
      
      resetMetrics();
      
      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.byMethod).toEqual({});
      expect(metrics.requests.byStatus).toEqual({});
      expect(metrics.requests.byRoute).toEqual({});
      expect(metrics.responseTime.total).toBe(0);
      expect(metrics.responseTime.count).toBe(0);
      expect(metrics.responseTime.average).toBe(0);
      expect(metrics.responseTime.min).toBe(Infinity);
      expect(metrics.responseTime.max).toBe(0);
      expect(metrics.errors.total).toBe(0);
      expect(metrics.errors.byType).toEqual({});
      expect(metrics.activeConnections).toBe(0);
    });
  });
});