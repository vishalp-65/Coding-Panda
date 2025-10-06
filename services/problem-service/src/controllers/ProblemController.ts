import { Request, Response } from 'express';
import { ProblemService } from '../services/ProblemService';
import { BaseController, ResponseHandler } from '@ai-platform/common';
import { ValidationUtils } from '@ai-platform/common';
import { asyncHandler } from '@ai-platform/common';
import { logger } from '@ai-platform/common';

interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

interface ValidatedRequest extends Request {
  user?: AuthenticatedUser;
  validatedBody?: any;
  validatedQuery?: any;
}

export class ProblemController extends BaseController {
  private problemService: ProblemService;

  constructor() {
    super();
    this.problemService = new ProblemService();
  }

  /**
   * Helper to get validated data from request
   */
  private getValidatedData(req: ValidatedRequest, source: 'body' | 'query') {
    return source === 'body'
      ? req.validatedBody || req.body
      : req.validatedQuery || req.query;
  }

  /**
   * Helper to ensure user is authenticated
   */
  private requireAuth(req: ValidatedRequest, res: Response): string | null {
    const userId = req.user?.id;
    if (!userId) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return null;
    }
    return userId;
  }

  createProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const problemData = this.getValidatedData(req, 'body');

      ValidationUtils.validateRequired(problemData.title, 'Title');
      ValidationUtils.validateRequired(problemData.description, 'Description');

      try {
        const problem = await this.problemService.createProblem(problemData);
        ResponseHandler.success(
          res,
          problem,
          'Problem created successfully',
          201
        );
      } catch (error) {
        logger.error('Error in createProblem controller:', error);

        if (
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          return ResponseHandler.conflict(res, error.message);
        }

        throw error;
      }
    }
  );

  getProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;

      ValidationUtils.validateRequired(id, 'Problem ID');

      // Try to get by ID first (MongoDB ObjectId pattern), then by slug
      const problem = ValidationUtils.isValidObjectId(id)
        ? await this.problemService.getProblemById(id)
        : await this.problemService.getProblemBySlug(id);

      if (!problem) {
        return ResponseHandler.notFound(res, 'Problem not found');
      }

      // Add user status if authenticated (placeholder for future implementation)
      const userStatus = userId ? null : null;

      ResponseHandler.success(res, { ...problem, userStatus });
    }
  );

  updateProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const updateData = this.getValidatedData(req, 'body');

      ValidationUtils.validateRequired(id, 'Problem ID');

      try {
        const problem = await this.problemService.updateProblem(id, updateData);

        if (!problem) {
          return ResponseHandler.notFound(res, 'Problem not found');
        }

        ResponseHandler.success(res, problem, 'Problem updated successfully');
      } catch (error) {
        logger.error('Error in updateProblem controller:', error);

        if (
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          return ResponseHandler.conflict(res, error.message);
        }

        throw error;
      }
    }
  );

  deleteProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;

      ValidationUtils.validateRequired(id, 'Problem ID');

      const deleted = await this.problemService.deleteProblem(id);

      if (!deleted) {
        return ResponseHandler.notFound(res, 'Problem not found');
      }

      ResponseHandler.success(res, undefined, 'Problem deleted successfully');
    }
  );

  searchProblems = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const queryParams = this.getValidatedData(req, 'query');

      const { page, limit } = ValidationUtils.validatePagination(
        queryParams.page as string,
        queryParams.limit as string
      );

      const result = await this.problemService.searchProblems(
        { ...queryParams, page, limit },
        userId
      );

      ResponseHandler.success(
        res,
        result.data,
        undefined,
        200,
        result.pagination
      );
    }
  );

  getPopularTags = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const limit = parseInt(req.query.limit as string) || 20;

      if (limit < 1 || limit > 100) {
        return ResponseHandler.badRequest(
          res,
          'Limit must be between 1 and 100'
        );
      }

      const tags = await this.problemService.getPopularTags(limit);
      ResponseHandler.success(res, tags);
    }
  );

  bookmarkProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = this.requireAuth(req, res);
      if (!userId) return;

      ValidationUtils.validateRequired(id, 'Problem ID');

      try {
        await this.problemService.bookmarkProblem(userId, id);
        ResponseHandler.success(
          res,
          undefined,
          'Problem bookmarked successfully'
        );
      } catch (error) {
        logger.error('Error in bookmarkProblem controller:', error);

        if (error instanceof Error && error.message.includes('not found')) {
          return ResponseHandler.notFound(res, 'Problem not found');
        }

        throw error;
      }
    }
  );

  unbookmarkProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = this.requireAuth(req, res);
      if (!userId) return;

      ValidationUtils.validateRequired(id, 'Problem ID');

      await this.problemService.unbookmarkProblem(userId, id);
      ResponseHandler.success(
        res,
        undefined,
        'Problem unbookmarked successfully'
      );
    }
  );

  rateProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = this.requireAuth(req, res);
      if (!userId) return;

      const { rating } = this.getValidatedData(req, 'body');

      ValidationUtils.validateRequired(id, 'Problem ID');
      ValidationUtils.validateRequired(rating, 'Rating');

      try {
        await this.problemService.rateProblem(userId, id, rating);
        ResponseHandler.success(res, undefined, 'Problem rated successfully');
      } catch (error) {
        logger.error('Error in rateProblem controller:', error);

        if (
          error instanceof Error &&
          error.message.includes('Rating must be')
        ) {
          return ResponseHandler.badRequest(res, error.message);
        }

        if (error instanceof Error && error.message.includes('not found')) {
          return ResponseHandler.notFound(res, 'Problem not found');
        }

        throw error;
      }
    }
  );

  getUserBookmarks = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const userId = this.requireAuth(req, res);
      if (!userId) return;

      const queryParams = this.getValidatedData(req, 'query');
      const { page, limit } = ValidationUtils.validatePagination(
        queryParams.page as string,
        queryParams.limit as string
      );

      const result = await this.problemService.getUserBookmarkedProblems(
        userId,
        page,
        limit
      );

      ResponseHandler.success(
        res,
        result.data,
        undefined,
        200,
        result.pagination
      );
    }
  );

  updateProblemStatistics = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const { isAccepted } = req.body;

      ValidationUtils.validateRequired(id, 'Problem ID');

      if (typeof isAccepted !== 'boolean') {
        return ResponseHandler.badRequest(
          res,
          'isAccepted must be a boolean value'
        );
      }

      try {
        await this.problemService.updateProblemStatistics(id, isAccepted);
        ResponseHandler.success(
          res,
          undefined,
          'Problem statistics updated successfully'
        );
      } catch (error) {
        logger.error('Error in updateProblemStatistics controller:', error);

        if (error instanceof Error && error.message.includes('not found')) {
          return ResponseHandler.notFound(res, 'Problem not found');
        }

        throw error;
      }
    }
  );

  healthCheck = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      ResponseHandler.success(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    }
  );
}
