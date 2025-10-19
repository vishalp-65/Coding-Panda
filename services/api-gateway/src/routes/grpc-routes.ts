import { Router } from 'express';
import {
    grpcAuthMiddleware,
    optionalGrpcAuthMiddleware,
    requireRole,
    requireVerification,
    AuthenticatedRequest
} from '../middleware/grpc-auth';
import { makeResilientCall } from '../grpc/clients';
import { logger } from '@ai-platform/common';
import { Request, Response } from 'express';

const router = Router();

// Helper function to extract request metadata
const getRequestMetadata = (req: AuthenticatedRequest) => ({
    requestId: req.requestId || 'unknown',
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRoles: req.user?.roles,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
});

// Helper function to handle gRPC responses
const handleGrpcResponse = (res: Response, grpcResponse: any, successMessage?: string) => {
    if (grpcResponse.base?.success) {
        const response: any = {
            success: true,
            data: grpcResponse
        };

        if (successMessage) {
            response.message = successMessage;
        }

        // Remove the base wrapper for cleaner API response
        delete response.data.base;

        return res.json(response);
    } else {
        const error = grpcResponse.base?.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error occurred' };
        return res.status(getHttpStatusFromGrpcError(error.code)).json({
            success: false,
            error
        });
    }
};

// Helper function to map gRPC error codes to HTTP status codes
const getHttpStatusFromGrpcError = (errorCode: string): number => {
    const errorMap: Record<string, number> = {
        'INVALID_ARGUMENT': 400,
        'VALIDATION_ERROR': 400,
        'REQUIRED_FIELD_MISSING': 400,
        'UNAUTHENTICATED': 401,
        'INVALID_TOKEN': 401,
        'PERMISSION_DENIED': 403,
        'INSUFFICIENT_PERMISSIONS': 403,
        'NOT_FOUND': 404,
        'USER_NOT_FOUND': 404,
        'PROBLEM_NOT_FOUND': 404,
        'ALREADY_EXISTS': 409,
        'USER_ALREADY_EXISTS': 409,
        'RESOURCE_EXHAUSTED': 429,
        'INTERNAL_ERROR': 500,
        'SERVICE_UNAVAILABLE': 503
    };

    return errorMap[errorCode] || 500;
};

// User Service Routes
router.post('/users', async (req: Request, res: Response) => {
    try {
        const response = await makeResilientCall<any>(
            'UserService',
            'createUser',
            {
                metadata: getRequestMetadata(req as AuthenticatedRequest),
                ...req.body
            }
        );

        handleGrpcResponse(res, response, 'User created successfully');
    } catch (error) {
        logger.error('Error creating user via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to create user'
            }
        });
    }
});

router.get('/users/check-email', async (req: Request, res: Response) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_PARAMETER',
                    message: 'Email parameter is required'
                }
            });
        }

        const response = await makeResilientCall<any>(
            'UserService',
            'checkEmailAvailability',
            { email: email as string }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error checking email availability via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to check email availability'
            }
        });
    }
});

router.get('/users/check-username', async (req: Request, res: Response) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_PARAMETER',
                    message: 'Username parameter is required'
                }
            });
        }

        const response = await makeResilientCall<any>(
            'UserService',
            'checkUsernameAvailability',
            { username: username as string }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error checking username availability via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to check username availability'
            }
        });
    }
});

router.get('/users/profile', grpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const response = await makeResilientCall<any>(
            'UserService',
            'getUser',
            {
                metadata: getRequestMetadata(req),
                userId: req.user!.id
            }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error getting user profile via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to get user profile'
            }
        });
    }
});

router.put('/users/profile', grpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const response = await makeResilientCall<any>(
            'UserService',
            'updateUser',
            {
                metadata: getRequestMetadata(req),
                userId: req.user!.id,
                ...req.body
            }
        );

        handleGrpcResponse(res, response, 'Profile updated successfully');
    } catch (error) {
        logger.error('Error updating user profile via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to update user profile'
            }
        });
    }
});

router.get('/users', grpcAuthMiddleware, requireRole(['admin', 'moderator']), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { limit = 20, offset = 0, search, roles, activeOnly } = req.query;

        const response = await makeResilientCall<any>(
            'UserService',
            'listUsers',
            {
                metadata: getRequestMetadata(req),
                pagination: {
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    sortBy: 'createdAt',
                    sortOrder: 'desc'
                },
                search: search as string || '',
                roles: roles ? (roles as string).split(',') : [],
                activeOnly: activeOnly === 'true'
            }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error listing users via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to list users'
            }
        });
    }
});

// Problem Service Routes
router.post('/problems', grpcAuthMiddleware, requireVerification, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const response = await makeResilientCall<any>(
            'ProblemService',
            'createProblem',
            {
                metadata: getRequestMetadata(req),
                ...req.body
            }
        );

        handleGrpcResponse(res, response, 'Problem created successfully');
    } catch (error) {
        logger.error('Error creating problem via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to create problem'
            }
        });
    }
});

router.get('/problems/search', optionalGrpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            q,
            difficulty,
            category,
            tags,
            author,
            limit = 20,
            offset = 0,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'searchProblems',
            {
                metadata: getRequestMetadata(req),
                pagination: {
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    sortBy: sort as string,
                    sortOrder: order as string
                },
                query: q as string || '',
                difficulties: difficulty ? (difficulty as string).split(',') : [],
                categories: category ? (category as string).split(',') : [],
                tags: tags ? (tags as string).split(',') : [],
                authorId: author as string || '',
                activeOnly: true
            }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error searching problems via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to search problems'
            }
        });
    }
});

router.get('/problems/:id', optionalGrpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { includeHidden } = req.query;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'getProblem',
            {
                metadata: getRequestMetadata(req),
                problemId: id,
                includeHiddenTestCases: includeHidden === 'true' && req.user?.roles?.includes('admin')
            }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error getting problem via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to get problem'
            }
        });
    }
});

router.put('/problems/:id', grpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'updateProblem',
            {
                metadata: getRequestMetadata(req),
                problemId: id,
                ...req.body
            }
        );

        handleGrpcResponse(res, response, 'Problem updated successfully');
    } catch (error) {
        logger.error('Error updating problem via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to update problem'
            }
        });
    }
});

router.delete('/problems/:id', grpcAuthMiddleware, requireRole(['admin', 'moderator']), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'deleteProblem',
            {
                metadata: getRequestMetadata(req),
                problemId: id
            }
        );

        handleGrpcResponse(res, response, 'Problem deleted successfully');
    } catch (error) {
        logger.error('Error deleting problem via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to delete problem'
            }
        });
    }
});

router.post('/problems/:id/bookmark', grpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'bookmarkProblem',
            {
                metadata: getRequestMetadata(req),
                problemId: id,
                userId: req.user!.id
            }
        );

        handleGrpcResponse(res, response, 'Problem bookmarked successfully');
    } catch (error) {
        logger.error('Error bookmarking problem via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to bookmark problem'
            }
        });
    }
});

router.delete('/problems/:id/bookmark', grpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'unbookmarkProblem',
            {
                metadata: getRequestMetadata(req),
                problemId: id,
                userId: req.user!.id
            }
        );

        handleGrpcResponse(res, response, 'Problem unbookmarked successfully');
    } catch (error) {
        logger.error('Error unbookmarking problem via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to unbookmark problem'
            }
        });
    }
});

router.get('/problems/bookmarks', grpcAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'getUserBookmarks',
            {
                metadata: getRequestMetadata(req),
                userId: req.user!.id,
                pagination: {
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    sortBy: 'createdAt',
                    sortOrder: 'desc'
                }
            }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error getting user bookmarks via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to get user bookmarks'
            }
        });
    }
});

router.get('/problems/tags/popular', async (req: Request, res: Response) => {
    try {
        const { limit = 20 } = req.query;

        const response = await makeResilientCall<any>(
            'ProblemService',
            'getPopularTags',
            {
                metadata: getRequestMetadata(req as AuthenticatedRequest),
                limit: parseInt(limit as string)
            }
        );

        handleGrpcResponse(res, response);
    } catch (error) {
        logger.error('Error getting popular tags via gRPC', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVICE_ERROR',
                message: 'Failed to get popular tags'
            }
        });
    }
});

// Health check endpoint for gRPC services
router.get('/health/grpc', async (req: Request, res: Response) => {
    try {
        const services = ['UserService', 'ProblemService'];
        const healthStatus: Record<string, any> = {};

        for (const serviceName of services) {
            try {
                const response = await makeResilientCall<any>(
                    serviceName,
                    'healthCheck',
                    {}
                );

                healthStatus[serviceName] = {
                    status: 'healthy',
                    details: response
                };
            } catch (error) {
                healthStatus[serviceName] = {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }

        const allHealthy = Object.values(healthStatus).every(status => status.status === 'healthy');

        res.status(allHealthy ? 200 : 503).json({
            success: allHealthy,
            data: {
                overall: allHealthy ? 'healthy' : 'degraded',
                services: healthStatus,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error checking gRPC services health', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'HEALTH_CHECK_ERROR',
                message: 'Failed to check services health'
            }
        });
    }
});

export { router as grpcRoutes };