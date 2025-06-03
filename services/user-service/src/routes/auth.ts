import { Router } from 'express';
import { AuthController } from '../controllers';
import { 
  validateRegistration, 
  validateLogin, 
  validateRefreshToken,
  validateEmailVerification,
  authenticate 
} from '../middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh-token', validateRefreshToken, authController.refreshToken);
router.get('/verify-email', validateEmailVerification, authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/validate-token', authenticate, authController.validateToken);

export { router as authRoutes };