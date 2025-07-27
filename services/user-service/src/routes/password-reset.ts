import { Router } from 'express';
import { PasswordResetController } from '../controllers';
import {
  validatePasswordResetRequest,
  validatePasswordReset,
} from '../middleware';

const router = Router();
const passwordResetController = new PasswordResetController();

// Password reset routes
router.post(
  '/request',
  validatePasswordResetRequest,
  passwordResetController.requestPasswordReset
);
router.post(
  '/reset',
  validatePasswordReset,
  passwordResetController.resetPassword
);
router.get('/validate-token', passwordResetController.validateResetToken);

export { router as passwordResetRoutes };
