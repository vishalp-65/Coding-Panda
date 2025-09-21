import { Request, Response } from 'express';
import { ContestService } from '../services/contest.service';
import {
  createContestSchema,
  updateContestSchema,
  contestRegistrationSchema,
  submitSolutionSchema,
  contestSearchSchema,
  uuidSchema,
} from '../validation/contest.validation';
import { logger } from '../utils/logger';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId: string | string[] | undefined;
  };
}

export class ContestController {
  constructor(private contestService: ContestService) {}

  // Utility methods for common operations
  private createErrorResponse(
    code: string,
    message: string,
    requestId: string | string[] | undefined
  ): ErrorResponse {
    return {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: requestId as string,
      },
    };
  }

  private sendError(
    res: Response,
    status: number,
    code: string,
    message: string,
    req: Request
  ): void {
    res
      .status(status)
      .json(
        this.createErrorResponse(code, message, req.headers['x-request-id'])
      );
  }

  private validateUUID(id: string, res: Response, req: Request): string | null {
    const { error, value } = uuidSchema.validate(id);
    if (error) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid contest ID format',
        req
      );
      return null;
    }
    return value;
  }

  private validateAuth(
    req: Request,
    res: Response
  ): { userId: string; username?: string } | null {
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId) {
      this.sendError(
        res,
        401,
        'UNAUTHORIZED',
        'User authentication required',
        req
      );
      return null;
    }

    return { userId, username };
  }

  private async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    res: Response,
    req: Request,
    successStatus: number = 200,
    errorMessage: string = 'Operation failed'
  ): Promise<void> {
    try {
      const result = await operation();

      if (successStatus === 204) {
        res.status(204).send();
      } else {
        res.status(successStatus).json(result);
      }
    } catch (error) {
      logger.error(`Error in ${operation.name}:`, error);
      this.handleServiceError(error, res, req, errorMessage);
    }
  }

  private handleServiceError(
    error: any,
    res: Response,
    req: Request,
    defaultMessage: string
  ): void {
    if (!(error instanceof Error)) {
      this.sendError(res, 500, 'INTERNAL_ERROR', defaultMessage, req);
      return;
    }

    const message = error.message.toLowerCase();

    // Handle common error patterns
    if (message.includes('not found')) {
      this.sendError(res, 404, 'NOT_FOUND', error.message, req);
    } else if (message.includes('unauthorized')) {
      this.sendError(res, 403, 'FORBIDDEN', error.message, req);
    } else if (
      message.includes('already registered') ||
      message.includes('full') ||
      message.includes('ended') ||
      message.includes('not active') ||
      message.includes('cannot submit')
    ) {
      this.sendError(res, 409, 'CONFLICT', error.message, req);
    } else if (message.includes('not registered')) {
      this.sendError(res, 404, 'NOT_FOUND', error.message, req);
    } else {
      this.sendError(res, 500, 'INTERNAL_ERROR', defaultMessage, req);
    }
  }

  createContest = async (req: Request, res: Response): Promise<void> => {
    const { error, value } = createContestSchema.validate(req.body);
    if (error) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        error.details[0].message,
        req
      );
      return;
    }

    const auth = this.validateAuth(req, res);
    if (!auth) return;

    await this.handleAsyncOperation(
      () => this.contestService.createContest(value, auth.userId),
      res,
      req,
      201,
      'Failed to create contest'
    );
  };

  getContest = async (req: Request, res: Response): Promise<void> => {
    const contestId = this.validateUUID(req.params.id, res, req);
    if (!contestId) return;

    await this.handleAsyncOperation(
      async () => {
        const contest = await this.contestService.getContest(contestId);
        if (!contest) {
          throw new Error('Contest not found');
        }
        return contest;
      },
      res,
      req,
      200,
      'Failed to retrieve contest'
    );
  };

  updateContest = async (req: Request, res: Response): Promise<void> => {
    const contestId = this.validateUUID(req.params.id, res, req);
    if (!contestId) return;

    const { error, value } = updateContestSchema.validate(req.body);
    if (error) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        error.details[0].message,
        req
      );
      return;
    }

    const auth = this.validateAuth(req, res);
    if (!auth) return;

    await this.handleAsyncOperation(
      async () => {
        const contest = await this.contestService.updateContest(
          contestId,
          value,
          auth.userId
        );
        if (!contest) {
          throw new Error('Contest not found');
        }
        return contest;
      },
      res,
      req,
      200,
      'Failed to update contest'
    );
  };

  deleteContest = async (req: Request, res: Response): Promise<void> => {
    const contestId = this.validateUUID(req.params.id, res, req);
    if (!contestId) return;

    const auth = this.validateAuth(req, res);
    if (!auth) return;

    await this.handleAsyncOperation(
      async () => {
        const deleted = await this.contestService.deleteContest(
          contestId,
          auth.userId
        );
        if (!deleted) {
          throw new Error('Contest not found');
        }
        return null; // No content for 204
      },
      res,
      req,
      204,
      'Failed to delete contest'
    );
  };

  searchContests = async (req: Request, res: Response): Promise<void> => {
    const { error, value } = contestSearchSchema.validate(req.query);
    if (error) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        error.details[0].message,
        req
      );
      return;
    }

    await this.handleAsyncOperation(
      () => this.contestService.searchContests(value),
      res,
      req,
      200,
      'Failed to search contests'
    );
  };

  registerForContest = async (req: Request, res: Response): Promise<void> => {
    const contestId = this.validateUUID(req.params.id, res, req);
    if (!contestId) return;

    const { error, value } = contestRegistrationSchema.validate(req.body);
    if (error) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        error.details[0].message,
        req
      );
      return;
    }

    const auth = this.validateAuth(req, res);
    if (!auth || !auth.username) {
      this.sendError(
        res,
        401,
        'UNAUTHORIZED',
        'User authentication with username required',
        req
      );
      return;
    }

    await this.handleAsyncOperation(
      () =>
        this.contestService.registerForContest(
          contestId,
          auth.userId,
          auth.username!,
          value
        ),
      res,
      req,
      201,
      'Failed to register for contest'
    );
  };

  submitSolution = async (req: Request, res: Response): Promise<void> => {
    const contestId = this.validateUUID(req.params.id, res, req);
    if (!contestId) return;

    const { error, value } = submitSolutionSchema.validate(req.body);
    if (error) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        error.details[0].message,
        req
      );
      return;
    }

    const auth = this.validateAuth(req, res);
    if (!auth) return;

    await this.handleAsyncOperation(
      () => this.contestService.submitSolution(contestId, auth.userId, value),
      res,
      req,
      201,
      'Failed to submit solution'
    );
  };

  getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    const contestId = this.validateUUID(req.params.id, res, req);
    if (!contestId) return;

    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;

    await this.handleAsyncOperation(
      () => this.contestService.getLeaderboard(contestId, limit),
      res,
      req,
      200,
      'Failed to retrieve leaderboard'
    );
  };
}
