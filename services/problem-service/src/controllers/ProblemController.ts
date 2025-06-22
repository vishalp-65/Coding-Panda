import { Request, Response } from 'express';
import { ProblemService } from '../services/ProblemService';
import { logger } from '@ai-platform/common';

export class ProblemController {
  private problemService: ProblemService;

  constructor() {
    this.problemService = new ProblemService();
  }

  createProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const problem = await this.problemService.createProblem(
        req.validatedBody
      );

      res.status(201).json({
        success: true,
        data: problem,
        message: 'Problem created successfully',
      });
    } catch (error) {
      logger.error('Error in createProblem controller:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: {
            code: 'PROBLEM_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  getProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id; // Assuming auth middleware sets req.user

      let problem;

      // Try to get by ID first, then by slug
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        problem = await this.problemService.getProblemById(id);
      } else {
        problem = await this.problemService.getProblemBySlug(id);
      }

      if (!problem) {
        res.status(404).json({
          error: {
            code: 'PROBLEM_NOT_FOUND',
            message: 'Problem not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Add user status if authenticated
      let userStatus = null;
      if (userId) {
        // This would typically be done in the service layer
        // For now, we'll keep it simple
      }

      res.json({
        success: true,
        data: { ...problem, userStatus },
      });
    } catch (error) {
      logger.error('Error in getProblem controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  updateProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const problem = await this.problemService.updateProblem(
        id,
        req.validatedBody
      );

      if (!problem) {
        res.status(404).json({
          error: {
            code: 'PROBLEM_NOT_FOUND',
            message: 'Problem not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: problem,
        message: 'Problem updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateProblem controller:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: {
            code: 'PROBLEM_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  deleteProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.problemService.deleteProblem(id);

      if (!deleted) {
        res.status(404).json({
          error: {
            code: 'PROBLEM_NOT_FOUND',
            message: 'Problem not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Problem deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteProblem controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  searchProblems = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const result = await this.problemService.searchProblems(
        req.validatedQuery,
        userId
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in searchProblems controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search problems',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  getPopularTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const tags = await this.problemService.getPopularTags(limit);

      res.json({
        success: true,
        data: tags,
      });
    } catch (error) {
      logger.error('Error in getPopularTags controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve popular tags',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  bookmarkProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await this.problemService.bookmarkProblem(userId, id);

      res.json({
        success: true,
        message: 'Problem bookmarked successfully',
      });
    } catch (error) {
      logger.error('Error in bookmarkProblem controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to bookmark problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  unbookmarkProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await this.problemService.unbookmarkProblem(userId, id);

      res.json({
        success: true,
        message: 'Problem unbookmarked successfully',
      });
    } catch (error) {
      logger.error('Error in unbookmarkProblem controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unbookmark problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  rateProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { rating } = req.validatedBody;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await this.problemService.rateProblem(userId, id, rating);

      res.json({
        success: true,
        message: 'Problem rated successfully',
      });
    } catch (error) {
      logger.error('Error in rateProblem controller:', error);

      if (error instanceof Error && error.message.includes('Rating must be')) {
        res.status(400).json({
          error: {
            code: 'INVALID_RATING',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to rate problem',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  getUserBookmarks = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { page, limit } = req.validatedQuery;
      const result = await this.problemService.getUserBookmarkedProblems(
        userId,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getUserBookmarks controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve bookmarked problems',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  updateProblemStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { isAccepted } = req.body;

      await this.problemService.updateProblemStatistics(id, isAccepted);

      res.json({
        success: true,
        message: 'Problem statistics updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateProblemStatistics controller:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update problem statistics',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}
