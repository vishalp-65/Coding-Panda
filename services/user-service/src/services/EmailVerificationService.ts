import { v4 as uuidv4 } from 'uuid';
import { AuthUtils } from '@ai-platform/common';
import { UserRepository, EmailVerificationTokenRepository } from '../repositories';
import { EmailService } from './EmailService';

export class EmailVerificationService {
  private userRepository: UserRepository;
  private tokenRepository: EmailVerificationTokenRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.tokenRepository = new EmailVerificationTokenRepository();
    this.emailService = new EmailService();
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // Invalidate existing tokens for this user
    await this.tokenRepository.deleteByUserId(user.id);

    // Generate secure token
    const token = uuidv4();
    const tokenHash = await AuthUtils.hashPassword(token);
    
    // Set expiration to 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store token
    await this.tokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = await AuthUtils.hashPassword(token);
    const verificationToken = await this.tokenRepository.findValidToken(tokenHash);

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Verification token has expired');
    }

    if (verificationToken.used) {
      throw new Error('Verification token has already been used');
    }

    // Mark email as verified
    await this.userRepository.verifyEmail(verificationToken.userId);

    // Mark token as used
    await this.tokenRepository.markAsUsed(verificationToken.id);

    // Send welcome email
    await this.emailService.sendWelcomeEmail(verificationToken.user.email, verificationToken.user.username);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    await this.sendVerificationEmail(user.id);
  }

  async validateVerificationToken(token: string): Promise<boolean> {
    const tokenHash = await AuthUtils.hashPassword(token);
    return this.tokenRepository.isValidToken(tokenHash);
  }

  async cleanupExpiredTokens(): Promise<number> {
    return this.tokenRepository.deleteExpired();
  }
}