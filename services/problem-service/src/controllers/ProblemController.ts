import { Request, Response } from 'express';
import { ProblemService } from '../services/ProblemService';
import { logger } from '@ai-platform/common';

// Type extensions to fix TypeScript errors
interface AuthenticatedUser {
  id: string;
  email?: string;
  // Add other user properties as needed
}

interface ValidatedRequest extends Request {
  user?: AuthenticatedUser;
  validatedBody?: any;
  validatedQuery?: any;
}

// Response types for better type safety
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    timestamp: string;
  };
}

export class ProblemController {
  private problemService: ProblemService;

  constructor() {
    this.problemService = new ProblemService();
  }

  // Helper method for consistent error responses
  private sendErrorResponse = (
    res: Response,
    statusCode: number,
    code: string,
    message: string
  ): void => {
    res.status(statusCode).json({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    } as ApiError);
  };

  // Helper method for success responses
  private sendSuccessResponse = <T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    pagination?: any
  ): void => {
    const response: ApiResponse<T> = {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(pagination && { pagination }),
    };
    res.status(statusCode).json(response);
  };

  createProblem = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const problemData = req.validatedBody || req.body;
      const problem = await this.problemService.createProblem(problemData);

      this.sendSuccessResponse(
        res,
        problem,
        'Problem created successfully',
        201
      );
    } catch (error) {
      logger.error('Error in createProblem controller:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        this.sendErrorResponse(res, 409, 'PROBLEM_EXISTS', error.message);
        return;
      }

      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to create problem'
      );
    }
  };

  getProblem = async (req: ValidatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        this.sendErrorResponse(
          res,
          400,
          'INVALID_REQUEST',
          'Problem ID is required'
        );
        return;
      }

      let problem;

      // Try to get by ID first (MongoDB ObjectId pattern), then by slug
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        problem = await this.problemService.getProblemById(id);
      } else {
        problem = await this.problemService.getProblemBySlug(id);
      }

      if (!problem) {
        this.sendErrorResponse(
          res,
          404,
          'PROBLEM_NOT_FOUND',
          'Problem not found'
        );
        return;
      }

      // Add user status if authenticated
      let userStatus = null;
      if (userId) {
        // This would typically be done in the service layer
        // For now, we'll keep it simple
        // userStatus =
        //   (await this.problemService.getUserProblemStatus?.(userId, id)) || null;
      }

      this.sendSuccessResponse(res, { ...problem, userStatus });
    } catch (error) {
      logger.error('Error in getProblem controller:', error);
      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to retrieve problem'
      );
    }
  };

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

  searchProblems = async (
    req: ValidatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const queryParams = req.validatedQuery || req.query;

      const result = await this.problemService.searchProblems(
        queryParams,
        userId
      );

      this.sendSuccessResponse(
        res,
        result.data,
        undefined,
        200,
        result.pagination
      );
    } catch (error) {
      logger.error('Error in searchProblems controller:', error);
      this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to search problems'
      );
    }
  };

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

  bookmarkProblem = async (
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

      await this.problemService.bookmarkProblem(userId, id);
      this.sendSuccessResponse(
        res,
        undefined,
        'Problem bookmarked successfully'
      );
    } catch (error) {
      logger.error('Error in bookmarkProblem controller:', error);

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
        'Failed to bookmark problem'
      );
    }
  };

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

      this.sendSuccessResponse(
        res,
        result.data,
        undefined,
        200,
        result.pagination
      );
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
