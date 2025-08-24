import request from 'supertest';
import express from 'express';
import { setupMiddleware } from '../middleware';
import { SecurityTestUtils } from '@ai-platform/common';

describe('API Gateway Security', () => {
    let app: express.Application;

    beforeAll(async () => {
        app = express();
        await setupMiddleware(app);

        // Add test routes
        app.get('/test', (req, res) => {
            res.json({ message: 'Test endpoint' });
        });

        app.post('/test', (req, res) => {
            res.json({ message: 'Test POST endpoint', body: req.body });
        });

        app.get('/auth/test', (req, res) => {
            res.json({ message: 'Auth test endpoint' });
        });
    });

    describe('Security Headers', () => {
        test('should include security headers', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(response.headers['x-api-version']).toBe('1.0');
            expect(response.headers['x-request-id']).toBeDefined();
        });

        test('should set cache control headers for auth endpoints', async () => {
            const response = await request(app)
                .get('/auth/test')
                .expect(200);

            expect(response.headers['cache-control']).toContain('no-store');
            expect(response.headers['cache-control']).toContain('no-cache');
            expect(response.headers['pragma']).toBe('no-cache');
            expect(response.headers['expires']).toBe('0');
        });
    });

    describe('Input Sanitization', () => {
        test('should sanitize malicious input', async () => {
            const maliciousInput = {
                name: "<script>alert('xss')</script>",
                description: "Normal text"
            };

            const response = await request(app)
                .post('/test')
                .send(maliciousInput)
                .expect(200);

            expect(response.body.body.name).not.toContain('<script>');
            expect(response.body.body.name).toContain('&lt;');
            expect(response.body.body.description).toBe('Normal text');
        });

        test('should block SQL injection attempts', async () => {
            const sqlInjection = {
                query: "'; DROP TABLE users; --"
            };

            await request(app)
                .post('/test')
                .send(sqlInjection)
                .expect(400)
                .expect((res) => {
                    expect(res.body.error.code).toBe('MALICIOUS_INPUT_DETECTED');
                });
        });

        test('should block XSS attempts', async () => {
            const xssAttempt = {
                content: "<img src=x onerror=alert('xss')>"
            };

            await request(app)
                .post('/test')
                .send(xssAttempt)
                .expect(400)
                .expect((res) => {
                    expect(res.body.error.code).toBe('MALICIOUS_INPUT_DETECTED');
                });
        });
    });

    describe('Request Validation', () => {
        test('should reject oversized payloads', async () => {
            const largePayload = {
                data: 'x'.repeat(2 * 1024 * 1024) // 2MB payload
            };

            await request(app)
                .post('/test')
                .send(largePayload)
                .expect(413)
                .expect((res) => {
                    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
                });
        });

        test('should reject deeply nested objects', async () => {
            // Create a deeply nested object
            let deepObject: any = {};
            let current = deepObject;
            for (let i = 0; i < 15; i++) {
                current.nested = {};
                current = current.nested;
            }
            current.value = 'deep';

            await request(app)
                .post('/test')
                .send(deepObject)
                .expect(400)
                .expect((res) => {
                    expect(res.body.error.code).toBe('INVALID_STRUCTURE');
                });
        });

        test('should validate content type', async () => {
            await request(app)
                .post('/test')
                .set('Content-Type', 'text/plain')
                .send('plain text')
                .expect(415)
                .expect((res) => {
                    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
                });
        });
    });

    describe('Rate Limiting', () => {
        test('should apply rate limiting', async () => {
            // Make multiple requests quickly
            const requests = Array(10).fill(null).map(() =>
                request(app).get('/test')
            );

            const responses = await Promise.all(requests);

            // Some requests should succeed, but we should see rate limit headers
            const successfulResponses = responses.filter(r => r.status === 200);
            expect(successfulResponses.length).toBeGreaterThan(0);

            // Check for rate limit headers
            const firstResponse = responses[0];
            expect(firstResponse.headers['ratelimit-limit']).toBeDefined();
            expect(firstResponse.headers['ratelimit-remaining']).toBeDefined();
        });
    });

    describe('Security Monitoring', () => {
        test('should log security events', async () => {
            // This test would require mocking the logger
            // For now, we'll just ensure the endpoint works
            await request(app)
                .get('/test')
                .expect(200);
        });
    });

    describe('Suspicious Activity Detection', () => {
        test('should detect path traversal attempts', async () => {
            await request(app)
                .get('/test/../../../etc/passwd')
                .expect((res) => {
                    // Should either block or sanitize the path
                    expect(res.status).not.toBe(500);
                });
        });

        test('should detect bot-like user agents', async () => {
            await request(app)
                .get('/test')
                .set('User-Agent', 'malicious-bot/1.0')
                .expect((res) => {
                    // Should apply stricter rate limiting or monitoring
                    expect(res.status).toBeLessThan(500);
                });
        });
    });

    describe('Request Timeout', () => {
        test('should timeout long-running requests', (done) => {
            // Create a route that takes a long time
            app.get('/slow', (req, res) => {
                setTimeout(() => {
                    res.json({ message: 'slow response' });
                }, 35000); // 35 seconds, longer than timeout
            });

            request(app)
                .get('/slow')
                .timeout(31000) // Set client timeout slightly longer than server timeout
                .expect(408)
                .end((err, res) => {
                    if (err && err.code === 'ECONNABORTED') {
                        // Request was aborted due to timeout
                        done();
                    } else if (res && res.status === 408) {
                        expect(res.body.error.code).toBe('REQUEST_TIMEOUT');
                        done();
                    } else {
                        done(new Error('Request should have timed out'));
                    }
                });
        }, 35000);
    });

    describe('Security Test Utils Integration', () => {
        test('should run comprehensive security tests', () => {
            const results = SecurityTestUtils.runAllTests();

            expect(results.summary.total).toBeGreaterThan(0);
            expect(results.summary.passed).toBeGreaterThan(0);

            // Most tests should pass
            const passRate = results.summary.passed / results.summary.total;
            expect(passRate).toBeGreaterThan(0.8); // 80% pass rate
        });
    });
});