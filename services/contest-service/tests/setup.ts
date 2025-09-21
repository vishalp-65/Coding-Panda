import { Pool } from 'pg';
import { createClient } from 'redis';

// Mock database connections for testing
jest.mock('../src/config/database', () => ({
  db: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  },
  redis: {
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  },
  initializeDatabase: jest.fn(),
  closeDatabase: jest.fn(),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'contest_service_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
