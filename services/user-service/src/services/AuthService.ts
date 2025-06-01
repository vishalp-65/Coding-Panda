import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthUtils } from '@ai-platform/common';
import { CreateUserRequest, LoginRequest, AuthResponse } from '@ai-platform/types';
import { UserRepository, UserSessionRepository } from '../repositories';
import { EmailService } from './EmailService';
import { config } from '../config/env';

export class AuthService {
  private userRepository: UserRepository;
  private sessionRepository: UserSessionRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.sessionRepository = new UserSessionRepository();
    this.emailService = new EmailService();
  }

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmailOrUsername(userData.email);
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Check username availability
    const usernameExists = await this.userRepository.existsByUsername(userData.username);
    if (usernameExists) {
      throw new Error('Username is already taken');
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.id);

    // Generate tokens
    const sessionId = AuthUtils.generateSessionId();
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      sessionId,
    };

    const accessToken = AuthUtils.generateAccessToken(payload);
    const refreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    // Store refresh token
    const refreshTokenHash = await AuthUtils.hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      sessionId,
      expiresAt,
    });

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async login(credentials: LoginRequest, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    // Find user by email or username
    const user = await this.userRepository.findByEmailOrUsername(credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // TODO: Implement 2FA verification if enabled
    if (user.twoFactorEnabled && !credentials.twoFactorCode) {
      throw new Error('Two-factor authentication code required');
    }

    // Generate tokens
    const sessionId = AuthUtils.generateSessionId();
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      sessionId,
    };

    const accessToken = AuthUtils.generateAccessToken(payload);
    const refreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    // Store refresh token
    const refreshTokenHash = await AuthUtils.hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      sessionId,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = AuthUtils.verifyToken(refreshToken);
      
      // Check if session exists and is valid
      const refreshTokenHash = await AuthUtils.hashPassword(refreshToken);
      const isValidSession = await this.sessionRepository.isValidSession(
        payload.sessionId,
        refreshTokenHash
      );

      if (!isValidSession) {
        throw new Error('Invalid or expired refresh token');
      }

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update session last used
      await this.sessionRepository.updateLastUsed(payload.sessionId);

      // Generate new access token
      const newPayload = {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        sessionId: payload.sessionId,
      };

      const accessToken = AuthUtils.generateAccessToken(newPayload);

      return {
        user: user.toSafeObject(),
        accessToken,
        refreshToken, // Keep the same refresh token
        expiresIn: 3600, // 1 hour in seconds
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.delete(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.deleteByUserId(userId);
  }

  async validateToken(token: string): Promise<{ userId: string; roles: string[] }> {
    try {
      const payload = AuthUtils.verifyToken(token);
      return {
        userId: payload.userId,
        roles: payload.roles,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}