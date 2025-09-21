import { UserRepository } from '../../repositories/UserRepository';
import { TestDataSource } from '../setup';
import { CreateUserRequest } from '@ai-platform/types';

// Mock the AppDataSource to use TestDataSource
jest.mock('../../config/database', () => ({
  AppDataSource: require('../setup').TestDataSource,
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
  });

  describe('create', () => {
    it('should create a new user with default profile and preferences', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.passwordHash).toBe(userData.passwordHash);
      expect(user.profile.firstName).toBe(userData.firstName);
      expect(user.profile.lastName).toBe(userData.lastName);
      expect(user.profile.skillLevel).toBe('beginner');
      expect(user.roles).toEqual(['user']);
      expect(user.isEmailVerified).toBe(false);
      expect(user.twoFactorEnabled).toBe(false);
    });

    it('should create user stats when creating a user', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
      };

      const user = await userRepository.create(userData);
      const userWithStats = await userRepository.findById(user.id);

      expect(userWithStats?.stats).toBeDefined();
      expect(userWithStats?.stats.totalSubmissions).toBe(0);
      expect(userWithStats?.stats.acceptedSubmissions).toBe(0);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null if user not found', async () => {
      const foundUser = await userRepository.findByEmail(
        'nonexistent@example.com'
      );
      expect(foundUser).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByUsername(userData.username);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.username).toBe(userData.username);
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
      };

      await userRepository.create(userData);
      const exists = await userRepository.existsByEmail(userData.email);

      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      const exists = await userRepository.existsByEmail(
        'nonexistent@example.com'
      );
      expect(exists).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
      };

      const user = await userRepository.create(userData);
      const profileUpdate = {
        bio: 'Updated bio',
        location: 'New York',
        skillLevel: 'intermediate' as const,
      };

      const updatedUser = await userRepository.updateProfile(
        user.id,
        profileUpdate
      );

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.profile.bio).toBe(profileUpdate.bio);
      expect(updatedUser?.profile.location).toBe(profileUpdate.location);
      expect(updatedUser?.profile.skillLevel).toBe(profileUpdate.skillLevel);
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', async () => {
      const userData: CreateUserRequest & { passwordHash: string } = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        passwordHash: 'hashedpassword',
      };

      const user = await userRepository.create(userData);
      expect(user.isEmailVerified).toBe(false);

      await userRepository.verifyEmail(user.id);
      const updatedUser = await userRepository.findById(user.id);

      expect(updatedUser?.isEmailVerified).toBe(true);
    });
  });
});
