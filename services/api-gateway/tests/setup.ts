import { logger } from '@ai-platform/common';

// Mock logger to prevent console output during tests
jest.mock('@ai-platform/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Global test timeout
jest.setTimeout(10000);
