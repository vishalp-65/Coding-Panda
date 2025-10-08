import { AuthUtils } from '@ai-platform/common';
import {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
} from '@ai-platform/types';
import { UserRepository, UserSessionRepository } from '../repositories';
import { EmailService } from './EmailService';

// Constants
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600;

export class AuthService {
  private userRepository: UserRepository;
  private sessionRepository: UserSessionRepository;
  private emailService: EmailService;

  constructor(
    userRepository?: UserRepository,
    sessionRepository?: UserSessionRepository,
    emailService?: EmailService
  ) {
    this.userRepository = userRepository || new UserRepository();
    this.sessionRepository = sessionRepository || new UserSessionRepository();
    this.emailService = emailService || new EmailService();
  }

  /**
   * Register a new user
   */
  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    await this.validateUserAvailability(userData.email, userData.username);

    const passwordHash = await AuthUtils.hashPassword(userData.password);
    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
    });

    // Send verification email asynchronously
    this.emailService.sendVerificationEmail(user.email, user.id).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    const tokens = await this.createUserSession(
      user.id,
      user.email,
      user.roles
    );

    return {
      user: user.toSafeObject(),
      ...tokens,
    };
  }

  /**
   * Authenticate user and create session
   */
  async login(
    credentials: LoginRequest,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    const user = await this.authenticateUser(credentials);

    const tokens = await this.createUserSession(
      user.id,
      user.email,
      user.roles,
      userAgent,
      ipAddress
    );

    return {
      user: user.toSafeObject(),
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const payload = this.verifyRefreshToken(refreshToken);

    await this.validateSession(payload.sessionId, refreshToken);

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.sessionRepository.updateLastUsed(payload.sessionId);

    const accessToken = AuthUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
      sessionId: payload.sessionId,
    });

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  /**
   * Get user information by ID
   */
  async getUserInfo(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      user: user.toSafeObject(),
    };
  }

  /**
   * Logout from specific session
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.delete(sessionId);
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.deleteByUserId(userId);
  }

  /**
   * Validate access token
   */
  async validateToken(
    token: string
  ): Promise<{ userId: string; roles: string[] }> {
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

  // Private helper methods

  /**
   * Validate user email and username availability
   */
  private async validateUserAvailability(
    email: string,
    username: string
  ): Promise<void> {
    const existingUser = await this.userRepository.findByEmailOrUsername(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const usernameExists = await this.userRepository.existsByUsername(username);
    if (usernameExists) {
      throw new Error('Username is already taken');
    }
  }

  /**
   * Authenticate user credentials
   */
  private async authenticateUser(credentials: LoginRequest) {
    const user = await this.userRepository.findByEmailOrUsername(
      credentials.email
    );
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await AuthUtils.comparePassword(
      credentials.password,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Handle 2FA if enabled
    if (user.twoFactorEnabled && !credentials.twoFactorCode) {
      throw new Error('Two-factor authentication code required');
    }

    // TODO: Verify 2FA code if provided
    if (user.twoFactorEnabled && credentials.twoFactorCode) {
      // Implement 2FA verification logic here
    }

    return user;
  }

  /**
   * Create user session and generate tokens
   */
  private async createUserSession(
    userId: string,
    email: string,
    roles: string[],
    userAgent?: string,
    ipAddress?: string
  ) {
    const sessionId = AuthUtils.generateSessionId();
    const payload = { userId, email, roles, sessionId };

    const accessToken = AuthUtils.generateAccessToken(payload);
    const refreshToken = AuthUtils.generateRefreshToken({
      userId,
      email,
      roles,
      sessionId,
    });

    await this.storeRefreshToken(
      userId,
      sessionId,
      refreshToken,
      userAgent,
      ipAddress
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(
    userId: string,
    sessionId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    // Store the last 8 characters of the token for validation (more secure than full token)
    const refreshTokenHash = refreshToken.slice(-8);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.sessionRepository.create({
      userId,
      refreshTokenHash,
      sessionId,
      expiresAt,
      userAgent,
      ipAddress,
    });
  }

  /**
   * Verify refresh token validity
   */
  private verifyRefreshToken(refreshToken: string) {
    try {
      return AuthUtils.verifyToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Validate session existence and token match
   */
  private async validateSession(
    sessionId: string,
    refreshToken: string
  ): Promise<void> {
    // Use the last 8 characters for validation
    const refreshTokenHash = refreshToken.slice(-8);
    const isValidSession = await this.sessionRepository.isValidSession(
      sessionId,
      refreshTokenHash
    );

    if (!isValidSession) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}
