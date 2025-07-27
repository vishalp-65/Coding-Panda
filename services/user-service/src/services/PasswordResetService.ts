import { v4 as uuidv4 } from 'uuid';
import { AuthUtils } from '@ai-platform/common';
import { UserRepository, PasswordResetTokenRepository } from '../repositories';
import { EmailService } from './EmailService';

export class PasswordResetService {
  private userRepository: UserRepository;
  private tokenRepository: PasswordResetTokenRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.tokenRepository = new PasswordResetTokenRepository();
    this.emailService = new EmailService();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Invalidate existing tokens for this user
    await this.tokenRepository.deleteByUserId(user.id);

    // Generate secure token
    const token = uuidv4();
    const tokenHash = await AuthUtils.hashPassword(token);

    // Set expiration to 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token
    await this.tokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = await AuthUtils.hashPassword(token);
    const resetToken = await this.tokenRepository.findValidToken(tokenHash);

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    if (resetToken.used) {
      throw new Error('Reset token has already been used');
    }

    // Hash new password
    const passwordHash = await AuthUtils.hashPassword(newPassword);

    // Update user password
    await this.userRepository.updatePassword(resetToken.userId, passwordHash);

    // Mark token as used
    await this.tokenRepository.markAsUsed(resetToken.id);

    // Send confirmation email
    await this.emailService.sendPasswordResetConfirmation(
      resetToken.user.email
    );
  }

  async validateResetToken(token: string): Promise<boolean> {
    const tokenHash = await AuthUtils.hashPassword(token);
    return this.tokenRepository.isValidToken(tokenHash);
  }

  async cleanupExpiredTokens(): Promise<number> {
    return this.tokenRepository.deleteExpired();
  }
}
