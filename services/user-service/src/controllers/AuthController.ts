import { Request, Response } from 'express';
import { AuthService, EmailVerificationService } from '../services';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;
  private emailVerificationService: EmailVerificationService;

  constructor() {
    this.authService = new AuthService();
    this.emailVerificationService = new EmailVerificationService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully. Please check your email for verification.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      
      res.status(400).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      const result = await this.authService.login(req.body, userAgent, ipAddress);
      
      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      
      res.status(401).json({
        error: {
          code: 'LOGIN_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      
      res.status(401).json({
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Extract session ID from token (would need to be implemented in AuthUtils)
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.substring(7);
        // This would require decoding the token to get session ID
        // For now, we'll implement logout all sessions
        await this.authService.logoutAll(req.user!.id);
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  logoutAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await this.authService.logoutAll(req.user!.id);
      
      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'LOGOUT_ALL_FAILED',
          message: 'Logout from all devices failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;
      await this.emailVerificationService.verifyEmail(token as string);
      
      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email verification failed';
      
      res.status(400).json({
        error: {
          code: 'EMAIL_VERIFICATION_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      await this.emailVerificationService.resendVerificationEmail(email);
      
      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification email';
      
      res.status(400).json({
        error: {
          code: 'VERIFICATION_EMAIL_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  validateToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // If we reach here, the token is valid (middleware already validated it)
    res.json({
      success: true,
      data: {
        user: req.user,
        valid: true,
      },
      message: 'Token is valid',
    });
  };
}