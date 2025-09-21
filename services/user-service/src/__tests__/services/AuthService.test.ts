import { AuthService } from '../../services/AuthService';
import { UserRepository, UserSessionRepository } from '../../repositories';
import { CreateUserRequest, LoginRequest } from '@ai-platform/types';
import { AuthUtils } from '@ai-platform/common';

// Mock dependencies
jest.mock('../../repositories/UserRepository');
jest.mock('../../repositories/UserSessionRepository');
jest.mock('../../services/EmailService');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockSessionRepository: jest.Mocked<UserSessionRepository>;

  beforeEach(() => {
    authService = new AuthService();
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockSessionRepository =
      new UserSessionRepository() as jest.Mocked<UserSessionRepository>;

    // Replace the repositories in the service
    (authService as any).userRepository = mockUserRepository;
    (authService as any).sessionRepository = mockSessionRepository;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData: CreateUserRequest = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 'user-id',
        email: userData.email,
        username: userData.username,
        roles: ['user'],
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          email: userData.email,
          username: userData.username,
        }),
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(null);
      mockUserRepository.existsByUsername.mockResolvedValue(false);
      mockUserRepository.create.mockResolvedValue(mockUser as any);
      mockSessionRepository.create.mockResolvedValue({} as any);

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          username: userData.username,
          passwordHash: expect.any(String),
        })
      );
    });

    it('should throw error if user already exists', async () => {
      const userData: CreateUserRequest = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue({} as any);

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email or username already exists'
      );
    });

    it('should throw error if username is taken', async () => {
      const userData: CreateUserRequest = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(null);
      mockUserRepository.existsByUsername.mockResolvedValue(true);

      await expect(authService.register(userData)).rejects.toThrow(
        'Username is already taken'
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-id',
        email: credentials.email,
        passwordHash: 'hashedpassword',
        roles: ['user'],
        twoFactorEnabled: false,
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          email: credentials.email,
        }),
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(
        mockUser as any
      );
      jest.spyOn(AuthUtils, 'comparePassword').mockResolvedValue(true);
      mockSessionRepository.create.mockResolvedValue({} as any);

      const result = await authService.login(credentials);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for wrong password', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        passwordHash: 'hashedpassword',
      };

      mockUserRepository.findByEmailOrUsername.mockResolvedValue(
        mockUser as any
      );
      jest.spyOn(AuthUtils, 'comparePassword').mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        roles: ['user'],
        sessionId: 'session-id',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        roles: ['user'],
        toSafeObject: jest.fn().mockReturnValue({
          id: 'user-id',
          email: 'test@example.com',
        }),
      };

      jest.spyOn(AuthUtils, 'verifyToken').mockReturnValue(mockPayload);
      mockSessionRepository.isValidSession.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockSessionRepository.updateLastUsed.mockResolvedValue();

      const result = await authService.refreshToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(mockSessionRepository.updateLastUsed).toHaveBeenCalledWith(
        'session-id'
      );
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      jest.spyOn(AuthUtils, 'verifyToken').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const token = 'valid-token';
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        roles: ['user'],
        sessionId: 'session-id',
      };

      jest.spyOn(AuthUtils, 'verifyToken').mockReturnValue(mockPayload);

      const result = await authService.validateToken(token);

      expect(result).toEqual({
        userId: 'user-id',
        roles: ['user'],
      });
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';

      jest.spyOn(AuthUtils, 'verifyToken').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken(token)).rejects.toThrow(
        'Invalid token'
      );
    });
  });
});
