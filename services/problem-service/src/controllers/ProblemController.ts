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

  createProblem = asyncHandler(async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    const problemData = req.validatedBody || req.body;

    ValidationUtils.validateRequired(problemData.title, 'Title');
    ValidationUtils.validateRequired(problemData.description, 'Description');

    try {
      const problem = await this.problemService.createProblem(problemData);
      ResponseHandler.success(res, problem, 'Problem created successfully', 201);
    } catch (error) {
      logger.error('Error in createProblem controller:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseHandler.conflict(res, error.message);
      }

      throw error;
    }
  });

  getProblem = asyncHandler(async (req: ValidatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    ValidationUtils.validateRequired(id, 'Problem ID');

    let problem;

    // Try to get by ID first (MongoDB ObjectId pattern), then by slug
    if (ValidationUtils.isValidObjectId(id)) {
      problem = await this.problemService.getProblemById(id);
    } else {
      problem = await this.problemService.getProblemBySlug(id);
    }

    if (!problem) {
      return ResponseHandler.notFound(res, 'Problem not found');
    }

    // Add user status if authenticated
    let userStatus = null;
    if (userId) {
      // This would typically be done in the service layer
      // userStatus = await this.problemService.getUserProblemStatus?.(userId, id) || null;
    }

    ResponseHandler.success(res, { ...problem, userStatus });
  });

  updateProblem = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.validatedBody || req.body;

      if (!id) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Problem ID is required'
        );
        return;
      }

      const problem = await this.problemService.updateProblem(id, updateData);

      if (!problem) {
        this.sendErrorResponse(
          res,
          404,
          'PROBLEM_NOT_FOUND',
          'Problem not found'
        );
        return;
      }

      this.sendSuccessResponse(res, problem, 'Problem updated successfully');
    } catch (error) {
      logger.error('Error in updateProblem controller:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        this.sendErrorResponse(res, 409, 'PROBLEM_EXISTS', error.message);
        return;
      }

      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to update problem'
      );
    }
  };

  deleteProblem = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Problem ID is required'
        );
        return;
      }

      const deleted = await this.problemService.deleteProblem(id);

      if (!deleted) {
        this.sendErrorResponse(
          res,
          404,
          'PROBLEM_NOT_FOUND',
          'Problem not found'
        );
        return;
      }

      this.sendSuccessResponse(res, undefined, 'Problem deleted successfully');
    } catch (error) {
      logger.error('Error in deleteProblem controller:', error);
      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to delete problem'
      );
    }
  };

  searchProblems = asyncHandler(async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user?.id;
    const queryParams = req.validatedQuery || req.query;

    const { page, limit } = ValidationUtils.validatePagination(
      queryParams.page as string,
      queryParams.limit as string
    );

    const result = await this.problemService.searchProblems(
      { ...queryParams, page, limit },
      userId
    );

    ResponseHandler.success(res, result.data, undefined, 200, result.pagination);
  });

  getPopularTags = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      if (limit < 1 || limit > 100) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_LIMIT',
          'Limit must be between 1 and 100'
        );
        return;
      }

      const tags = await this.problemService.getPopularTags(limit);
      this.sendSuccessResponse(res, tags);
    } catch (error) {
      logger.error('Error in getPopularTags controller:', error);
      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to retrieve popular tags'
      );
    }
  };

  bookmarkProblem = asyncHandler(async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    ValidationUtils.validateRequired(id, 'Problem ID');

    try {
      await this.problemService.bookmarkProblem(userId, id);
      ResponseHandler.success(res, undefined, 'Problem bookmarked successfully');
    } catch (error) {
      logger.error('Error in bookmarkProblem controller:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseHandler.notFound(res, 'Problem not found');
      }

      throw error;
    }
  });

  unbookmarkProblem = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        this.sendErrorResponse(
          res,
          401,
          'UNAUTHORIZED',
          'Authentication required'
        );
        return;
      }

      if (!id) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Problem ID is required'
        );
        return;
      }

      await this.problemService.unbookmarkProblem(userId, id);
      this.sendSuccessResponse(
        res,
        undefined,
        'Problem unbookmarked successfully'
      );
    } catch (error) {
      logger.error('Error in unbookmarkProblem controller:', error);
      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to unbookmark problem'
      );
    }
  };

  rateProblem = async (req: ValidatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { rating } = req.validatedBody || req.body;

      if (!userId) {
        this.sendErrorResponse(
          res,
          401,
          'UNAUTHORIZED',
          'Authentication required'
        );
        return;
      }

      if (!id) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Problem ID is required'
        );
        return;
      }

      if (rating === undefined || rating === null) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Rating is required'
        );
        return;
      }

      await this.problemService.rateProblem(userId, id, rating);
      this.sendSuccessResponse(res, undefined, 'Problem rated successfully');
    } catch (error) {
      logger.error('Error in rateProblem controller:', error);

      if (error instanceof Error && error.message.includes('Rating must be')) {
        this.sendErrorResponse(res, 400, 'INVALID_RATING', error.message);
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        this.sendErrorResponse(
          res,
          404,
          'PROBLEM_NOT_FOUND',
          'Problem not found'
        );
        return;
      }

      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to rate problem'
      );
    }
  };

  getUserBookmarks = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        this.sendErrorResponse(
          res,
          401,
          'UNAUTHORIZED',
          'Authentication required'
        );
        return;
      }

      const queryParams = req.validatedQuery || req.query;
      const page = parseInt(queryParams.page as string) || 1;
      const limit = parseInt(queryParams.limit as string) || 10;

      if (page < 1 || limit < 1 || limit > 100) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_PAGINATION',
          'Invalid pagination parameters'
        );
        return;
      }

      const result = await this.problemService.getUserBookmarkedProblems(
        userId,
        page,
        limit
      );

      ResponseHandler.success(res, result.data, undefined, 200, result.pagination);
    } catch (error) {
      logger.error('Error in getUserBookmarks controller:', error);
      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to retrieve bookmarked problems'
      );
    }
  };

  updateProblemStatistics = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { isAccepted } = req.body;

      if (!id) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Problem ID is required'
        );
        return;
      }

      if (typeof isAccepted !== 'boolean') {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'isAccepted must be a boolean value'
        );
        return;
      }

      await this.problemService.updateProblemStatistics(id, isAccepted);
      this.sendSuccessResponse(
        res,
        undefined,
        'Problem statistics updated successfully'
      );
    } catch (error) {
      logger.error('Error in updateProblemStatistics controller:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        this.sendErrorResponse(
          res,
          404,
          'PROBLEM_NOT_FOUND',
          'Problem not found'
        );
        return;
      }

      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to update problem statistics'
      );
    }
  };

  // Additional utility method for health check
  healthCheck = async (req: ValidatedRequest, res: Response): Promise<void> => {
    try {
      this.sendSuccessResponse(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error in healthCheck controller:', error);
      this.sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'Service unavailable');
    }
  };
}
