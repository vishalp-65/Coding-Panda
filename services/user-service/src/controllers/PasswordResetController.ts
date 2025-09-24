import { Request, Response } from 'express';
import { PasswordResetService } from '../services';
import { HTTP_STATUS } from '@ai-platform/common';

export class PasswordResetController {
  private passwordResetService: PasswordResetService;

  constructor() {
    this.passwordResetService = new PasswordResetService();
  }

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      await this.passwordResetService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'PASSWORD_RESET_REQUEST_FAILED',
          message: 'Failed to process password reset request',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;
      await this.passwordResetService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Password reset failed';

      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  validateResetToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;
      const isValid = await this.passwordResetService.validateResetToken(
        token as string
      );

      res.json({
        success: true,
        data: { valid: isValid },
        message: isValid ? 'Token is valid' : 'Token is invalid or expired',
      });
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'TOKEN_VALIDATION_FAILED',
          message: 'Failed to validate reset token',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}
