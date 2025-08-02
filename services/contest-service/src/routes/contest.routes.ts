import { Router } from 'express';
import { ContestController } from '../controllers/contest.controller';
import {
  authenticateToken,
  optionalAuth,
  requireRole,
} from '../middleware/auth.middleware';

export const createContestRoutes = (
  contestController: ContestController
): Router => {
  const router = Router();

  // Public routes (with optional authentication)
  router.get('/contests', optionalAuth, contestController.searchContests);
  router.get('/contests/:id', optionalAuth, contestController.getContest);
  router.get(
    '/contests/:id/leaderboard',
    optionalAuth,
    contestController.getLeaderboard
  );

  // Protected routes (require authentication)
  router.post('/contests', authenticateToken, contestController.createContest);
  router.put(
    '/contests/:id',
    authenticateToken,
    contestController.updateContest
  );
  router.delete(
    '/contests/:id',
    authenticateToken,
    contestController.deleteContest
  );
  router.post(
    '/contests/:id/register',
    authenticateToken,
    contestController.registerForContest
  );
  router.post(
    '/contests/:id/submit',
    authenticateToken,
    contestController.submitSolution
  );

  // Admin routes (require admin role)
  // router.post('/contests/:id/cancel', authenticateToken, requireRole(['admin']), contestController.cancelContest);
  // router.get('/contests/:id/analytics', authenticateToken, requireRole(['admin', 'contest_creator']), contestController.getContestAnalytics);

  return router;
};
