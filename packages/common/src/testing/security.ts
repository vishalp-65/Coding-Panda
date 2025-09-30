import { Request, Response } from 'express';
import { InputSanitizer, DataEncryption } from '../security';
import { AuthUtils } from '../auth';

export class SecurityTestUtils {
    // SQL Injection test payloads
    static readonly SQL_INJECTION_PAYLOADS = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "admin'/*",
        "' OR 1=1#",
        "' OR 'a'='a",
        "') OR ('1'='1",
        "1' OR '1'='1' --",
        "1' OR '1'='1' /*",
    ];

    // XSS test payloads
    static readonly XSS_PAYLOADS = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
        "javascript:alert('XSS')",
        "<iframe src=javascript:alert('XSS')></iframe>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
        "<select onfocus=alert('XSS') autofocus>",
        "<textarea onfocus=alert('XSS') autofocus>",
        "<keygen onfocus=alert('XSS') autofocus>",
    ];

    // Path traversal test payloads
    static readonly PATH_TRAVERSAL_PAYLOADS = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "....//....//....//etc/passwd",
        "..%2F..%2F..%2Fetc%2Fpasswd",
        "..%252F..%252F..%252Fetc%252Fpasswd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    ];

    // Command injection test payloads
    static readonly COMMAND_INJECTION_PAYLOADS = [
        "; ls -la",
        "| cat /etc/passwd",
        "&& whoami",
        "`id`",
        "$(id)",
        "; cat /etc/passwd #",
        "| nc -l -p 4444 -e /bin/sh",
        "; rm -rf / --no-preserve-root",
    ];

    // Test input sanitization
    static testInputSanitization(): { passed: number; failed: number; results: any[] } {
        const results: any[] = [];
        let passed = 0;
        let failed = 0;

        // Test SQL injection detection
        this.SQL_INJECTION_PAYLOADS.forEach(payload => {
            const detected = InputSanitizer.detectSQLInjection(payload);
            if (detected) {
                passed++;
                results.push({ type: 'SQL_INJECTION', payload, detected: true, status: 'PASS' });
            } else {
                failed++;
                results.push({ type: 'SQL_INJECTION', payload, detected: false, status: 'FAIL' });
            }
        });

        // Test XSS detection
        this.XSS_PAYLOADS.forEach(payload => {
            const detected = InputSanitizer.detectXSS(payload);
            if (detected) {
                passed++;
                results.push({ type: 'XSS', payload, detected: true, status: 'PASS' });
            } else {
                failed++;
                results.push({ type: 'XSS', payload, detected: false, status: 'FAIL' });
            }
        });

        // Test sanitization
        const testStrings = [
            '<script>alert("test")</script>',
            'SELECT * FROM users',
            '<img src=x onerror=alert(1)>',
            'normal text',
        ];

        testStrings.forEach(str => {
            const sanitized = InputSanitizer.sanitizeString(str);
            const containsHtml = /<[^>]*>/.test(sanitized);

            if (!containsHtml || sanitized !== str) {
                passed++;
                results.push({
                    type: 'SANITIZATION',
                    original: str,
                    sanitized,
                    status: 'PASS'
                });
            } else {
                failed++;
                results.push({
                    type: 'SANITIZATION',
                    original: str,
                    sanitized,
                    status: 'FAIL'
                });
            }
        });

        return { passed, failed, results };
    }

    // Test password strength validation
    static testPasswordStrength(): { passed: number; failed: number; results: any[] } {
        const results: any[] = [];
        let passed = 0;
        let failed = 0;

        const testCases = [
            { password: 'Password123!', shouldPass: true },
            { password: 'password', shouldPass: false },
            { password: '12345678', shouldPass: false },
            { password: 'PASSWORD', shouldPass: false },
            { password: 'Pass123', shouldPass: false },
            { password: 'Password123', shouldPass: false },
            { password: 'Aa1!', shouldPass: false },
            { password: 'ComplexPassword123!', shouldPass: true },
            { password: 'aaaaaaaA1!', shouldPass: false }, // repeated chars
            { password: 'password123!', shouldPass: false }, // common pattern
        ];

        testCases.forEach(testCase => {
            const result = AuthUtils.validatePasswordStrength(testCase.password);
            const actualPass = result.isValid;

            if (actualPass === testCase.shouldPass) {
                passed++;
                results.push({
                    password: testCase.password,
                    expected: testCase.shouldPass,
                    actual: actualPass,
                    errors: result.errors,
                    status: 'PASS',
                });
            } else {
                failed++;
                results.push({
                    password: testCase.password,
                    expected: testCase.shouldPass,
                    actual: actualPass,
                    errors: result.errors,
                    status: 'FAIL',
                });
            }
        });

        return { passed, failed, results };
    }

    // Test JWT token security
    static testJWTSecurity(): { passed: number; failed: number; results: any[] } {
        const results: any[] = [];
        let passed = 0;
        let failed = 0;

        const testPayload = {
            userId: 'test-user-id',
            email: 'test@example.com',
            roles: ['user'],
            sessionId: 'test-session-id',
        };

        try {
            // Test token generation
            const token = AuthUtils.generateAccessToken(testPayload);
            if (token && typeof token === 'string') {
                passed++;
                results.push({ test: 'TOKEN_GENERATION', status: 'PASS' });
            } else {
                failed++;
                results.push({ test: 'TOKEN_GENERATION', status: 'FAIL', error: 'Invalid token format' });
            }

            // Test token verification
            try {
                const decoded = AuthUtils.verifyToken(token);
                if (decoded.userId === testPayload.userId) {
                    passed++;
                    results.push({ test: 'TOKEN_VERIFICATION', status: 'PASS' });
                } else {
                    failed++;
                    results.push({ test: 'TOKEN_VERIFICATION', status: 'FAIL', error: 'Token payload mismatch' });
                }
            } catch (error) {
                failed++;
                results.push({ test: 'TOKEN_VERIFICATION', status: 'FAIL', error: (error as Error).message });
            }

            // Test invalid token
            try {
                AuthUtils.verifyToken('invalid.token.here');
                failed++;
                results.push({ test: 'INVALID_TOKEN_REJECTION', status: 'FAIL', error: 'Should have thrown error' });
            } catch (error) {
                passed++;
                results.push({ test: 'INVALID_TOKEN_REJECTION', status: 'PASS' });
            }

        } catch (error) {
            failed++;
            results.push({ test: 'JWT_SECURITY', status: 'FAIL', error: (error as Error).message });
        }

        return { passed, failed, results };
    }

    // Test encryption/decryption
    static testDataEncryption(): { passed: number; failed: number; results: any[] } {
        const results: any[] = [];
        let passed = 0;
        let failed = 0;

        // Set a test encryption key
        process.env.ENCRYPTION_KEY = 'test-encryption-key-for-security-testing';

        const testData = [
            'simple text',
            'complex data with special chars: !@#$%^&*()',
            JSON.stringify({ user: 'test', data: [1, 2, 3] }),
            '',
        ];

        testData.forEach(data => {
            try {
                const encrypted = DataEncryption.encrypt(data);
                const decrypted = DataEncryption.decrypt(encrypted);

                if (decrypted === data) {
                    passed++;
                    results.push({
                        test: 'ENCRYPTION_DECRYPTION',
                        data: data.substring(0, 50),
                        status: 'PASS',
                    });
                } else {
                    failed++;
                    results.push({
                        test: 'ENCRYPTION_DECRYPTION',
                        data: data.substring(0, 50),
                        status: 'FAIL',
                        error: 'Decrypted data does not match original',
                    });
                }
            } catch (error) {
                failed++;
                results.push({
                    test: 'ENCRYPTION_DECRYPTION',
                    data: data.substring(0, 50),
                    status: 'FAIL',
                    error: (error as Error).message,
                });
            }
        });

        // Test hash function
        try {
            const hash1 = DataEncryption.hash('test data');
            const hash2 = DataEncryption.hash('test data');
            const hash3 = DataEncryption.hash('different data');

            if (hash1 === hash2 && hash1 !== hash3) {
                passed++;
                results.push({ test: 'HASH_FUNCTION', status: 'PASS' });
            } else {
                failed++;
                results.push({ test: 'HASH_FUNCTION', status: 'FAIL', error: 'Hash function inconsistent' });
            }
        } catch (error) {
            failed++;
            results.push({ test: 'HASH_FUNCTION', status: 'FAIL', error: (error as Error).message });
        }

        return { passed, failed, results };
    }

    // Run all security tests
    static runAllTests(): {
        summary: { total: number; passed: number; failed: number };
        details: { [key: string]: any };
    } {
        const inputSanitization = this.testInputSanitization();
        const passwordStrength = this.testPasswordStrength();
        const jwtSecurity = this.testJWTSecurity();
        const dataEncryption = this.testDataEncryption();

        const total = inputSanitization.passed + inputSanitization.failed +
            passwordStrength.passed + passwordStrength.failed +
            jwtSecurity.passed + jwtSecurity.failed +
            dataEncryption.passed + dataEncryption.failed;

        const passed = inputSanitization.passed + passwordStrength.passed +
            jwtSecurity.passed + dataEncryption.passed;

        const failed = inputSanitization.failed + passwordStrength.failed +
            jwtSecurity.failed + dataEncryption.failed;

        return {
            summary: { total, passed, failed },
            details: {
                inputSanitization,
                passwordStrength,
                jwtSecurity,
                dataEncryption,
            },
        };
    }

    // Create mock request for testing
    static createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
        return {
            ip: '127.0.0.1',
            method: 'POST',
            path: '/test',
            headers: {
                'content-type': 'application/json',
                'user-agent': 'test-agent',
            },
            body: {},
            query: {},
            params: {},
            get: (header: string) => {
                const headers: any = overrides.headers || {};
                return headers[header.toLowerCase()];
            },
            ...overrides,
        };
    }

    // Create mock response for testing
    static createMockResponse(): Partial<Response> {
        const res: any = {
            statusCode: 200,
            headersSent: false,
            status: (code: number) => {
                res.statusCode = code;
                return res;
            },
            json: (data: any) => {
                res.data = data;
                return res;
            },
            on: (event: string, callback: Function) => {
                // Mock event handling
            },
        };
        return res;
    }
}