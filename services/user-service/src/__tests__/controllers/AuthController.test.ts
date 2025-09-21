import request from 'supertest';
import { createApp } from '../../app';
import { AuthService } from '../../services/AuthService';
import { EmailVerificationService } from '../../services/EmailVerificationService';

// Mock services
jest.mock('../../services/AuthService');
jest.mock('../../services/EmailVerificationService');
jest.mock('../../config/database', () => ({
  AppDataSource: {
    initialize: jest.fn(),
    getRepository: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

describe('AuthController', () => {
  let app: any;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockEmailVerificationService: jest.Mocked<EmailVerificationService>;

  beforeEach(() => {
    app = createApp();
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    mockEmailVerificationService =
      new EmailVerificationService() as jest.Mocked<EmailVerificationService>;
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockResponse = {
        user: {
          id: 'user-id',
          email: userData.email,
          username: userData.username,
          profile: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            skillLevel: 'beginner' as const,
            programmingLanguages: [],
          },
          preferences: {
            theme: 'system' as const,
            language: 'en',
            timezone: 'UTC',
            emailNotifications: {
              contestReminders: true,
              newProblems: true,
              achievementUnlocked: true,
              weeklyDigest: true,
              socialActivity: false,
            },
            privacySettings: {
              profileVisibility: 'public' as const,
              showEmail: false,
              showRealName: false,
              showLocation: false,
              allowDirectMessages: true,
            },
          },
          roles: ['user' as const],
          isEmailVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(response.body.message).toContain('registered successfully');
    });

    it('should return validation error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle registration failure', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('User already exists')
      );

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('REGISTRATION_FAILED');
      expect(response.body.error.message).toBe('User already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockResponse = {
        user: {
          id: 'user-id',
          email: credentials.email,
          username: 'testuser',
          profile: {
            skillLevel: 'beginner' as const,
            programmingLanguages: [],
          },
          preferences: {
            theme: 'system' as const,
            language: 'en',
            timezone: 'UTC',
            emailNotifications: {
              contestReminders: true,
              newProblems: true,
              achievementUnlocked: true,
              weeklyDigest: true,
              socialActivity: false,
            },
            privacySettings: {
              profileVisibility: 'public' as const,
              showEmail: false,
              showRealName: false,
              showLocation: false,
              allowDirectMessages: true,
            },
          },
          roles: ['user' as const],
          isEmailVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(response.body.message).toBe('Login successful');
    });

    it('should return error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.error.code).toBe('LOGIN_FAILED');
      expect(response.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenData = {
        refreshToken: 'valid-refresh-token',
      };

      const mockResponse = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          username: 'testuser',
          profile: {
            skillLevel: 'beginner' as const,
            programmingLanguages: [],
          },
          preferences: {
            theme: 'system' as const,
            language: 'en',
            timezone: 'UTC',
            emailNotifications: {
              contestReminders: true,
              newProblems: true,
              achievementUnlocked: true,
              weeklyDigest: true,
              socialActivity: false,
            },
            privacySettings: {
              profileVisibility: 'public' as const,
              showEmail: false,
              showRealName: false,
              showLocation: false,
              allowDirectMessages: true,
            },
          },
          roles: ['user' as const],
          isEmailVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'new-access-token',
        refreshToken: 'valid-refresh-token',
        expiresIn: 3600,
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send(refreshTokenData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
    });

    it('should return error for invalid refresh token', async () => {
      const refreshTokenData = {
        refreshToken: 'invalid-refresh-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send(refreshTokenData)
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_REFRESH_FAILED');
    });
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-verification-token';

      mockEmailVerificationService.verifyEmail.mockResolvedValue();

      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully');
    });

    it('should return error for invalid verification token', async () => {
      const token = 'invalid-token';

      mockEmailVerificationService.verifyEmail.mockRejectedValue(
        new Error('Invalid verification token')
      );

      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${token}`)
        .expect(400);

      expect(response.body.error.code).toBe('EMAIL_VERIFICATION_FAILED');
    });
  });
});
