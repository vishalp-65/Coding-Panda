import { DataSource } from 'typeorm';
import {
  User,
  UserSession,
  PasswordResetToken,
  EmailVerificationToken,
  UserStats,
} from '../entities';

// Test database configuration
export const TestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'user_service_test',
  synchronize: true,
  dropSchema: true,
  entities: [
    User,
    UserSession,
    PasswordResetToken,
    EmailVerificationToken,
    UserStats,
  ],
  logging: false,
});

beforeAll(async () => {
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
  }
});

afterAll(async () => {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
});

beforeEach(async () => {
  // Clean up database before each test
  const entities = TestDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = TestDataSource.getRepository(entity.name);
    await repository.clear();
  }
});

// Mock email service for tests
jest.mock('../services/EmailService', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => ({
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetConfirmation: jest.fn().mockResolvedValue(undefined),
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    })),
  };
});
