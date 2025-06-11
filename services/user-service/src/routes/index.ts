import { Router } from 'express';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { passwordResetRoutes } from './password-reset';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/password-reset', passwordResetRoutes);

export { router as apiRoutes };