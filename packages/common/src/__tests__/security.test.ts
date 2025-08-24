import {
    InputSanitizer,
    DataEncryption,
    SecurityAuditLogger,
    createRateLimit,
    securityHeaders
} from '../security';
import { AuthUtils } from '../auth';
import { SecurityTestUtils } from '../testing/security';

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing';

describe('Security Utilities', () => {
    describe('InputSanitizer', () => {
        test('should detect SQL injection attempts', () => {
            const sqlInjectionAttempts = [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --",
            ];

            sqlInjectionAttempts.forEach(attempt => {
                expect(InputSanitizer.detectSQLInjection(attempt)).toBe(true);
            });
        });

        test('should detect XSS attempts', () => {
            const xssAttempts = [
                "<script>alert('XSS')</script>",
                "<img src=x onerror=alert('XSS')>",
                "<svg onload=alert('XSS')>",
            ];

            xssAttempts.forEach(attempt => {
                expect(InputSanitizer.detectXSS(attempt)).toBe(true);
            });
        });

        test('should sanitize dangerous strings', () => {
            const dangerous = "<script>alert('test')</script>";
            const sanitized = InputSanitizer.sanitizeString(dangerous);

            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('</script>');
            expect(sanitized).toContain('&lt;');
            expect(sanitized).toContain('&gt;');
        });

        test('should sanitize objects recursively', () => {
            const safeObj = {
                name: "John Doe",
                data: {
                    value: "normal text",
                    array: ["safe text 1", "safe text 2"]
                }
            };

            const sanitized = InputSanitizer.sanitizeObject(safeObj);

            expect(sanitized.name).toBe('John Doe');
            expect(sanitized.data.value).toBe('normal text');
            expect(sanitized.data.array[0]).toBe('safe text 1');
            expect(sanitized.data.array[1]).toBe('safe text 2');
        });

        test('should throw error for malicious input', () => {
            const maliciousObj = {
                query: "'; DROP TABLE users; --"
            };

            expect(() => {
                InputSanitizer.sanitizeObject(maliciousObj);
            }).toThrow('Potentially malicious input detected');
        });
    });

    describe('DataEncryption', () => {
        test('should encrypt and decrypt data correctly', () => {
            const testData = 'sensitive information';

            const encrypted = DataEncryption.encrypt(testData);
            expect(encrypted).not.toBe(testData);
            expect(encrypted).toContain(':'); // Should have IV:tag:data format

            const decrypted = DataEncryption.decrypt(encrypted);
            expect(decrypted).toBe(testData);
        });

        test('should generate consistent hashes', () => {
            const data = 'test data';
            const hash1 = DataEncryption.hash(data);
            const hash2 = DataEncryption.hash(data);
            const hash3 = DataEncryption.hash('different data');

            expect(hash1).toBe(hash2);
            expect(hash1).not.toBe(hash3);
            expect(hash1).toHaveLength(64); // SHA-256 hex length
        });

        test('should generate secure tokens', () => {
            const token1 = DataEncryption.generateSecureToken();
            const token2 = DataEncryption.generateSecureToken();

            expect(token1).not.toBe(token2);
            expect(token1).toHaveLength(64); // 32 bytes * 2 (hex)
            expect(token2).toHaveLength(64);
        });

        test('should handle invalid encrypted data', () => {
            expect(() => {
                DataEncryption.decrypt('invalid:format');
            }).toThrow('Invalid encrypted data format');

            expect(() => {
                DataEncryption.decrypt('invalid');
            }).toThrow('Invalid encrypted data format');
        });
    });

    describe('AuthUtils', () => {
        test('should validate password strength correctly', () => {
            const strongPassword = 'MySecure456!';
            const weakPassword = 'weak';

            const strongResult = AuthUtils.validatePasswordStrength(strongPassword);
            const weakResult = AuthUtils.validatePasswordStrength(weakPassword);

            expect(strongResult.isValid).toBe(true);
            expect(strongResult.errors).toHaveLength(0);

            expect(weakResult.isValid).toBe(false);
            expect(weakResult.errors.length).toBeGreaterThan(0);
        });

        test('should generate and verify JWT tokens', () => {
            const payload = {
                userId: 'test-user-id',
                email: 'test@example.com',
                roles: ['user'],
                sessionId: 'test-session-id',
            };

            const token = AuthUtils.generateAccessToken(payload);
            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');

            const decoded = AuthUtils.verifyToken(token);
            expect(decoded.userId).toBe(payload.userId);
            expect(decoded.email).toBe(payload.email);
            expect(decoded.roles).toEqual(payload.roles);
        });

        test('should handle invalid JWT tokens', () => {
            expect(() => {
                AuthUtils.verifyToken('invalid.token.here');
            }).toThrow();
        });

        test('should track login attempts', () => {
            const identifier = 'test@example.com';

            // Should allow initial attempts
            expect(AuthUtils.checkLoginAttempts(identifier)).toBe(true);

            // Record failed attempts
            for (let i = 0; i < 5; i++) {
                AuthUtils.recordFailedLogin(identifier);
            }

            // Should block after max attempts
            expect(AuthUtils.checkLoginAttempts(identifier)).toBe(false);

            // Should allow after clearing
            AuthUtils.clearFailedLogins(identifier);
            expect(AuthUtils.checkLoginAttempts(identifier)).toBe(true);
        });

        test('should generate valid API keys', () => {
            const apiKey = AuthUtils.generateApiKey();

            expect(apiKey).toMatch(/^ap_[A-Za-z0-9_-]{43}$/);
            expect(AuthUtils.validateApiKey(apiKey)).toBe(true);
            expect(AuthUtils.validateApiKey('invalid-key')).toBe(false);
        });
    });

    describe('SecurityTestUtils', () => {
        test('should run comprehensive security tests', () => {
            const results = SecurityTestUtils.runAllTests();

            expect(results.summary.total).toBeGreaterThan(0);
            expect(results.summary.passed).toBeGreaterThan(0);
            expect(results.details).toHaveProperty('inputSanitization');
            expect(results.details).toHaveProperty('passwordStrength');
            expect(results.details).toHaveProperty('jwtSecurity');
            expect(results.details).toHaveProperty('dataEncryption');
        });

        test('should create mock request and response objects', () => {
            const mockReq = SecurityTestUtils.createMockRequest({
                method: 'POST',
                path: '/test',
            });

            const mockRes = SecurityTestUtils.createMockResponse();

            expect(mockReq.method).toBe('POST');
            expect(mockReq.path).toBe('/test');
            expect(mockReq.ip).toBe('127.0.0.1');

            expect(mockRes.status).toBeDefined();
            expect(mockRes.json).toBeDefined();
        });
    });

    describe('Rate Limiting', () => {
        test('should create rate limit middleware', () => {
            const rateLimitMiddleware = createRateLimit({
                windowMs: 60000,
                max: 10,
                message: 'Too many requests',
            });

            expect(rateLimitMiddleware).toBeDefined();
            expect(typeof rateLimitMiddleware).toBe('function');
        });
    });

    describe('Security Headers', () => {
        test('should apply security headers', () => {
            expect(securityHeaders).toBeDefined();
            expect(typeof securityHeaders).toBe('function');
        });
    });
});