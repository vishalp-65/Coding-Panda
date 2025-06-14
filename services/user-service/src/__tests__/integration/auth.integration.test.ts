import request from 'supertest';
import { createApp } from '../../app';
import { TestDataSource } from '../setup';
import { UserRepository } from '../../repositories/UserRepository';

// Mock the AppDataSource to use TestDataSource
jest.mock('../../config/database', () => ({
  AppDataSource: require('../setup').TestDataSource,
  initializeDatabase: jest.fn(),
}));

describe('Auth Integration Tests', () => {
  let app: any;
  let userRepository: UserRepository;

  beforeAll(async () => {
    app = createApp();
    userRepository = new UserRepository();
  });

  describe('User Registration and Login Flow', () => {
    it('should complete full registration and login flow', async () => {
      const userData = {
        email: 'integration@example.com',
        username: 'integrationuser',
        password: 'Password123!',
        firstName: 'Integration',
        lastName: 'Test',
      };

      // 1. Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.accessToken).toBeDefined();
      expect(registerResponse.body.data.refreshToken).toBeDefined();

      // 2. Verify user was created in database
      const createdUser = await userRepository.findByEmail(userData.email);
      expect(createdUser).toBeDefined();
      expect(createdUser?.username).toBe(userData.username);
      expect(createdUser?.isEmailVerified).toBe(false);

      // 3. Login with the same credentials
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.email).toBe(userData.email);
      expect(loginResponse.body.data.accessToken).toBeDefined();

      // 4. Use access token to get profile
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(userData.email);
      expect(profileResponse.body.data.profile.firstName).toBe(userData.firstName);
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'Password123!',
      };

      // First registration should succeed
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const duplicateData = {
        ...userData,
        username: 'user2',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body.error.code).toBe('REGISTRATION_FAILED');
    });

    it('should prevent duplicate username registration', async () => {
      const userData = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'Password123!',
      };

      // First registration should succeed
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same username should fail
      const duplicateData = {
        email: 'user2@example.com',
        username: userData.username,
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body.error.code).toBe('REGISTRATION_FAILED');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token using refresh token', async () => {
      const userData = {
        email: 'refresh@example.com',
        username: 'refreshuser',
        password: 'Password123!',
      };

      // Register and login
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const { refreshToken } = registerResponse.body.data;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).toBe(refreshToken);

      // Use new access token
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
    });
  });

  describe('Profile Management', () => {
    it('should update user profile', async () => {
      const userData = {
        email: 'profile@example.com',
        username: 'profileuser',
        password: 'Password123!',
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const { accessToken } = registerResponse.body.data;

      // Update profile
      const profileUpdate = {
        bio: 'Updated bio',
        location: 'New York',
        skillLevel: 'intermediate',
        programmingLanguages: ['JavaScript', 'Python'],
      };

      const updateResponse = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(profileUpdate)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.profile.bio).toBe(profileUpdate.bio);
      expect(updateResponse.body.data.profile.location).toBe(profileUpdate.location);
      expect(updateResponse.body.data.profile.skillLevel).toBe(profileUpdate.skillLevel);
    });

    it('should update user preferences', async () => {
      const userData = {
        email: 'preferences@example.com',
        username: 'preferencesuser',
        password: 'Password123!',
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const { accessToken } = registerResponse.body.data;

      // Update preferences
      const preferencesUpdate = {
        theme: 'dark',
        language: 'es',
        emailNotifications: {
          contestReminders: false,
          newProblems: true,
        },
      };

      const updateResponse = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(preferencesUpdate)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.preferences.theme).toBe(preferencesUpdate.theme);
      expect(updateResponse.body.data.preferences.language).toBe(preferencesUpdate.language);
    });
  });
});