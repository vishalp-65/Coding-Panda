import { Router } from 'express';
import { ProblemController } from '../controllers/ProblemController';
import { validateRequest, validateQuery } from '@ai-platform/common';
import {
  createProblemWithCodeSpecSchema,
  paginationSchema,
  ratingSchema,
  searchProblemsSchema,
  updateProblemSchema,
} from '../validation/problemValidation';

const router = Router();
const problemController = new ProblemController();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Problem Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Problem CRUD operations
router.post(
  '/',
  validateRequest(createProblemWithCodeSpecSchema),
  problemController.createCodingProblem
);

router.get(
  '/search',
  validateQuery(searchProblemsSchema),
  problemController.searchProblems
);

router.get('/tags/popular', problemController.getPopularTags);

router.get(
  '/bookmarks',
  validateQuery(paginationSchema),
  problemController.getUserBookmarks
);

router.get('/:id', problemController.getProblem);

router.get('/:id/template', problemController.getProblemCodeTemplate);

router.put(
  '/:id',
  validateRequest(updateProblemSchema),
  problemController.updateProblem
);

router.delete('/:id', problemController.deleteProblem);

// User-specific problem operations
router.post('/:id/bookmark', problemController.bookmarkProblem);

router.delete('/:id/bookmark', problemController.unbookmarkProblem);

router.post(
  '/:id/rate',
  validateRequest(ratingSchema),
  problemController.rateProblem
);

// Statistics update (typically called by other services)
router.post('/:id/statistics', problemController.updateProblemStatistics);

// Admin operations
router.post(
  '/admin/assign-numbers',
  problemController.assignNumbersToExistingProblems
);

export { router as problemRoutes };
