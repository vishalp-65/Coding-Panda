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

  // ==================== PROBLEM CRUD OPERATIONS ====================

  // createProblem = asyncHandler(
  //   async (req: ValidatedRequest, res: Response): Promise<void> => {
  //     const problemData = this.getValidatedData(req, 'body');

  //     this.validateProblemData(problemData);

  //     try {
  //       const problem = await this.problemService.createProblem(problemData);
  //       ResponseHandler.success(
  //         res,
  //         problem,
  //         'Problem created successfully',
  //         201
  //       );
  //     } catch (error) {
  //       this.handleProblemCreationError(error, res);
  //     }
  //   }
  // );

  createCodingProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { problemData, codeSpec } = this.getValidatedData(req, 'body');

      this.validateCodingProblemData(problemData, codeSpec);

      try {
        const problem = await this.problemService.createCodingProblem(
          problemData,
          codeSpec
        );
        ResponseHandler.success(
          res,
          problem,
          'Coding problem created successfully with templates',
          201
        );
      } catch (error) {
        this.handleProblemCreationError(error, res);
      }
    }
  );

  getProblem = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;

      ValidationUtils.validateRequired(id, 'Problem ID');

      const problem = await this.findProblemByIdentifier(id);

      if (!problem) {
        return ResponseHandler.notFound(res, 'Problem not found');
      }

      ResponseHandler.success(res, {
        ...problem,
        userStatus: userId ? null : null,
      });
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
        this.handleProblemUpdateError(error, res);
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

  // ==================== PROBLEM SEARCH & FILTERING ====================

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
      const limit = this.parseAndValidateLimit(req.query.limit as string);

      const tags = await this.problemService.getPopularTags(limit);
      ResponseHandler.success(res, tags);
    }
  );

  // ==================== USER-SPECIFIC OPERATIONS ====================

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
        this.handleNotFoundError(error, res, 'Problem not found');
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
        this.handleRatingError(error, res);
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

  // ==================== PROBLEM STATISTICS ====================

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
        this.handleNotFoundError(error, res, 'Problem not found');
      }
    }
  );

  // ==================== CODE TEMPLATES ====================

  getProblemCodeTemplate = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const { language } = req.query;

      ValidationUtils.validateRequired(id, 'Problem ID');
      ValidationUtils.validateRequired(language, 'Language');

      try {
        const template = await this.problemService.getProblemCodeTemplate(
          id,
          language as string
        );

        if (!template) {
          return ResponseHandler.notFound(
            res,
            'Code template not found for this problem and language'
          );
        }

        ResponseHandler.success(res, template);
      } catch (error) {
        this.handleNotFoundError(error, res, 'Problem not found');
      }
    }
  );

  // ==================== UTILITY ENDPOINTS ====================

  assignNumbersToExistingProblems = asyncHandler(
    async (req: ValidatedRequest, res: Response): Promise<void> => {
      try {
        await this.problemService.assignNumbersToExistingProblems();
        ResponseHandler.success(
          res,
          undefined,
          'Numbers assigned to existing problems successfully'
        );
      } catch (error) {
        logger.error(
          'Error in assignNumbersToExistingProblems controller:',
          error
        );
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

  // ==================== PRIVATE HELPER METHODS ====================

  private getValidatedData(
    req: ValidatedRequest,
    source: 'body' | 'query'
  ): any {
    return source === 'body'
      ? req.validatedBody || req.body
      : req.validatedQuery || req.query;
  }

  private requireAuth(req: ValidatedRequest, res: Response): string | null {
    const userId = req.user?.id;
    if (!userId) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return null;
    }
    return userId;
  }

  private validateProblemData(problemData: any): void {
    ValidationUtils.validateRequired(problemData.title, 'Title');
    ValidationUtils.validateRequired(problemData.description, 'Description');
  }

  private validateCodingProblemData(problemData: any, codeSpec: any): void {
    this.validateProblemData(problemData);
    ValidationUtils.validateRequired(codeSpec, 'Code specification');
    ValidationUtils.validateRequired(
      codeSpec.functionDefinition,
      'Function definition'
    );
  }

  private async findProblemByIdentifier(id: string): Promise<any | null> {
    // Try to get by ID first (MongoDB ObjectId pattern)
    if (ValidationUtils.isValidObjectId(id)) {
      return await this.problemService.getProblemById(id);
    }

    // Try to get by number if it's a numeric string
    if (/^\d+$/.test(id)) {
      return await this.problemService.getProblemByNumber(parseInt(id));
    }

    // Finally try by slug
    return await this.problemService.getProblemBySlug(id);
  }

  private parseAndValidateLimit(limitParam: string | undefined): number {
    const limit = parseInt(limitParam || '20');

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return limit;
  }

  private handleProblemCreationError(error: unknown, res: Response): void {
    logger.error('Error in problem creation:', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      ResponseHandler.conflict(res, error.message);
      return;
    }

    throw error;
  }

  private handleProblemUpdateError(error: unknown, res: Response): void {
    logger.error('Error in problem update:', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      ResponseHandler.conflict(res, error.message);
      return;
    }

    throw error;
  }

  private handleRatingError(error: unknown, res: Response): void {
    logger.error('Error in problem rating:', error);

    if (error instanceof Error) {
      if (error.message.includes('Rating must be')) {
        ResponseHandler.badRequest(res, error.message);
        return;
      }

      if (error.message.includes('not found')) {
        ResponseHandler.notFound(res, 'Problem not found');
        return;
      }
    }

    throw error;
  }

  private handleNotFoundError(
    error: unknown,
    res: Response,
    message: string
  ): void {
    logger.error('Error in controller operation:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      ResponseHandler.notFound(res, message);
      return;
    }

    throw error;
  }
}
