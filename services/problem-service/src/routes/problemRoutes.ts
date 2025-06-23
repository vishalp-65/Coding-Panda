import { Router } from 'express';
import { ProblemController } from '../controllers/ProblemController';
import { validateRequest, validateQuery } from '@ai-platform/common';
import {
  createProblemSchema,
  updateProblemSchema,
  searchProblemsSchema,
  ratingSchema,
  paginationSchema
} from '../validation/problemValidation';

const router = Router();
const problemController = new ProblemController();

// Problem CRUD operations
router.post(
  '/',
  validateRequest(createProblemSchema),
  problemController.createProblem
);

router.get(
  '/search',
  validateQuery(searchProblemsSchema),
  problemController.searchProblems
);

router.get(
  '/tags/popular',
  problemController.getPopularTags
);

router.get(
  '/bookmarks',
  validateQuery(paginationSchema),
  problemController.getUserBookmarks
);

router.get(
  '/:id',
  problemController.getProblem
);

router.put(
  '/:id',
  validateRequest(updateProblemSchema),
  problemController.updateProblem
);

router.delete(
  '/:id',
  problemController.deleteProblem
);

// User-specific problem operations
router.post(
  '/:id/bookmark',
  problemController.bookmarkProblem
);

router.delete(
  '/:id/bookmark',
  problemController.unbookmarkProblem
);

router.post(
  '/:id/rate',
  validateRequest(ratingSchema),
  problemController.rateProblem
);

// Statistics update (typically called by other services)
router.post(
  '/:id/statistics',
  problemController.updateProblemStatistics
);

export { router as problemRoutes };