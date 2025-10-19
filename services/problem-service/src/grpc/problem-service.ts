import {
    GrpcServer,
    createHealthCheckImplementation,
    extractMetadata,
    createBaseResponse,
    validateRequiredFields,
    createPaginationResponse,
    handleAsyncGrpcCall,
    createNotFoundError,
    createAlreadyExistsError,
    createValidationErrorResponse
} from '@ai-platform/grpc-common';
import { ProblemServiceService } from '@ai-platform/grpc-common';
import { ProblemController } from '../controllers/ProblemController';

export class ProblemGrpcService {
    private server: GrpcServer;
    private problemController: ProblemController;

    constructor() {
        this.server = new GrpcServer({
            port: parseInt(process.env.GRPC_PORT || '50052'),
            options: {
                'grpc.max_receive_message_length': 4 * 1024 * 1024,
                'grpc.max_send_message_length': 4 * 1024 * 1024,
            }
        });

        this.problemController = new ProblemController();
        this.setupService();
    }

    private setupService(): void {
        const implementation = {
            // Health check
            healthCheck: this.healthCheck.bind(this),

            // Problem CRUD
            createProblem: this.createProblem.bind(this),
            getProblem: this.getProblem.bind(this),
            updateProblem: this.updateProblem.bind(this),
            deleteProblem: this.deleteProblem.bind(this),
            searchProblems: this.searchProblems.bind(this),

            // Problem interactions
            bookmarkProblem: this.bookmarkProblem.bind(this),
            unbookmarkProblem: this.unbookmarkProblem.bind(this),
            getUserBookmarks: this.getUserBookmarks.bind(this),
            rateProblem: this.rateProblem.bind(this),

            // Problem statistics
            updateProblemStatistics: this.updateProblemStatistics.bind(this),
            getProblemStatistics: this.getProblemStatistics.bind(this),

            // Tags and categories
            getPopularTags: this.getPopularTags.bind(this),
            getCategories: this.getCategories.bind(this),
        };

        this.server.addService(ProblemServiceService, implementation, 'ProblemService');
    }

    // Health check implementation
    private healthCheck(call: any, callback: any): void {
        const health = this.server.getHealth();
        callback(null, {
            service: health.service,
            status: health.status,
            version: health.version,
            timestamp: health.timestamp,
            uptime: health.uptime
        });
    }

    // Create problem implementation
    private async createProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            // Validate required fields
            const validation = validateRequiredFields(request, [
                'title', 'description', 'difficulty', 'category', 'examples', 'testCases', 'timeLimit', 'memoryLimit'
            ]);

            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const problemData = {
                title: request.title,
                description: request.description,
                difficulty: request.difficulty,
                category: request.category,
                tags: request.tags || [],
                constraints: request.constraints || '',
                examples: request.examples.map((ex: any) => ({
                    input: ex.input,
                    output: ex.output,
                    explanation: ex.explanation || ''
                })),
                testCases: request.testCases.map((tc: any) => ({
                    id: tc.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden || false,
                    weight: tc.weight || 1
                })),
                timeLimit: request.timeLimit,
                memoryLimit: request.memoryLimit,
                authorId: metadata.userId
            };

            // Create problem using controller logic
            const mockReq = {
                body: problemData,
                user: { id: metadata.userId }
            };
            const mockRes = {
                status: (code: number) => ({
                    json: (data: any) => {
                        if (code === 201) {
                            callback(null, {
                                base: createBaseResponse(true, 'Problem created successfully'),
                                problem: this.mapProblemToProto(data.data)
                            });
                        } else {
                            callback(null, {
                                base: createBaseResponse(false, data.error?.message || 'Failed to create problem', [], {
                                    code: data.error?.code || 'INTERNAL_ERROR',
                                    message: data.error?.message || 'Failed to create problem'
                                })
                            });
                        }
                    }
                })
            };

            await this.problemController.createProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error creating problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to create problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get problem implementation
    private async getProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const mockReq = {
                params: { id: request.problemId },
                query: { includeHidden: request.includeHiddenTestCases },
                user: { id: metadata.userId }
            };
            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true),
                            problem: this.mapProblemToProto(data.data)
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Problem not found', [], {
                                code: data.error?.code || 'PROBLEM_NOT_FOUND',
                                message: data.error?.message || 'Problem not found'
                            })
                        });
                    }
                }
            };

            await this.problemController.getProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error getting problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Search problems implementation
    private async searchProblems(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const pagination = request.pagination || {};
            const limit = pagination.limit || 20;
            const offset = pagination.offset || 0;

            const mockReq = {
                query: {
                    q: request.query || '',
                    difficulty: request.difficulties || [],
                    category: request.categories || [],
                    tags: request.tags || [],
                    author: request.authorId || '',
                    active: request.activeOnly || false,
                    limit,
                    offset,
                    sort: pagination.sortBy || 'createdAt',
                    order: pagination.sortOrder || 'desc'
                },
                user: { id: metadata.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true),
                            problems: data.data.problems.map((p: any) => this.mapProblemToProto(p)),
                            pagination: createPaginationResponse(data.data.total, limit, offset)
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to search problems', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to search problems'
                            })
                        });
                    }
                }
            };

            await this.problemController.searchProblems(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error searching problems:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to search problems', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Update problem implementation
    private async updateProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const updateData: any = {};
            if (request.title) updateData.title = request.title;
            if (request.description) updateData.description = request.description;
            if (request.difficulty) updateData.difficulty = request.difficulty;
            if (request.category) updateData.category = request.category;
            if (request.tags) updateData.tags = request.tags;
            if (request.constraints) updateData.constraints = request.constraints;
            if (request.examples) {
                updateData.examples = request.examples.map((ex: any) => ({
                    input: ex.input,
                    output: ex.output,
                    explanation: ex.explanation || ''
                }));
            }
            if (request.testCases) {
                updateData.testCases = request.testCases.map((tc: any) => ({
                    id: tc.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden || false,
                    weight: tc.weight || 1
                }));
            }
            if (request.timeLimit) updateData.timeLimit = request.timeLimit;
            if (request.memoryLimit) updateData.memoryLimit = request.memoryLimit;

            const mockReq = {
                params: { id: request.problemId },
                body: updateData,
                user: { id: metadata.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true, 'Problem updated successfully'),
                            problem: this.mapProblemToProto(data.data)
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to update problem', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to update problem'
                            })
                        });
                    }
                }
            };

            await this.problemController.updateProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error updating problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to update problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Delete problem implementation
    private async deleteProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const mockReq = {
                params: { id: request.problemId },
                user: { id: metadata.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true, 'Problem deleted successfully')
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to delete problem', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to delete problem'
                            })
                        });
                    }
                }
            };

            await this.problemController.deleteProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error deleting problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to delete problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Bookmark problem implementation
    private async bookmarkProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId', 'userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const mockReq = {
                params: { id: request.problemId },
                user: { id: request.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    callback(null, {
                        base: createBaseResponse(data.success, data.message || 'Problem bookmarked successfully')
                    });
                }
            };

            await this.problemController.bookmarkProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error bookmarking problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to bookmark problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Unbookmark problem implementation
    private async unbookmarkProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId', 'userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const mockReq = {
                params: { id: request.problemId },
                user: { id: request.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    callback(null, {
                        base: createBaseResponse(data.success, data.message || 'Problem unbookmarked successfully')
                    });
                }
            };

            await this.problemController.unbookmarkProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error unbookmarking problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to unbookmark problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get user bookmarks implementation
    private async getUserBookmarks(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['userId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const pagination = request.pagination || {};
            const limit = pagination.limit || 20;
            const offset = pagination.offset || 0;

            const mockReq = {
                query: { limit, offset },
                user: { id: request.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true),
                            problems: data.data.problems.map((p: any) => this.mapProblemToProto(p)),
                            pagination: createPaginationResponse(data.data.total, limit, offset)
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to get bookmarks', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to get bookmarks'
                            })
                        });
                    }
                }
            };

            await this.problemController.getUserBookmarks(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error getting user bookmarks:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get user bookmarks', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Rate problem implementation
    private async rateProblem(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId', 'userId', 'rating']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const mockReq = {
                params: { id: request.problemId },
                body: { rating: request.rating },
                user: { id: request.userId }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true, 'Problem rated successfully'),
                            newAverageRating: data.data.averageRating || 0,
                            totalRatings: data.data.totalRatings || 0
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to rate problem', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to rate problem'
                            })
                        });
                    }
                }
            };

            await this.problemController.rateProblem(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error rating problem:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to rate problem', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Update problem statistics implementation
    private async updateProblemStatistics(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            const mockReq = {
                params: { id: request.problemId },
                body: {
                    totalSubmissionsDelta: request.totalSubmissionsDelta || 0,
                    acceptedSubmissionsDelta: request.acceptedSubmissionsDelta || 0
                }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true, 'Statistics updated successfully'),
                            statistics: this.mapStatisticsToProto(data.data)
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to update statistics', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to update statistics'
                            })
                        });
                    }
                }
            };

            await this.problemController.updateProblemStatistics(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error updating problem statistics:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to update problem statistics', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get problem statistics implementation
    private async getProblemStatistics(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const validation = validateRequiredFields(request, ['problemId']);
            if (!validation.isValid) {
                return callback(null, {
                    base: createValidationErrorResponse(validation.missingFields.map(field => ({
                        field,
                        message: `${field} is required`,
                        code: 'REQUIRED_FIELD_MISSING'
                    })))
                });
            }

            // This would need to be implemented in the controller
            // For now, return a mock response
            callback(null, {
                base: createBaseResponse(true),
                statistics: {
                    totalSubmissions: 0,
                    acceptedSubmissions: 0,
                    acceptanceRate: 0,
                    averageRating: 0,
                    totalRatings: 0
                }
            });

        } catch (error) {
            console.error('Error getting problem statistics:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get problem statistics', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get popular tags implementation
    private async getPopularTags(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            const mockReq = {
                query: { limit: request.limit || 20 }
            };

            const mockRes = {
                json: (data: any) => {
                    if (data.success) {
                        callback(null, {
                            base: createBaseResponse(true),
                            tags: data.data.map((tag: any) => ({
                                tag: tag.tag,
                                count: tag.count
                            }))
                        });
                    } else {
                        callback(null, {
                            base: createBaseResponse(false, data.error?.message || 'Failed to get popular tags', [], {
                                code: data.error?.code || 'INTERNAL_ERROR',
                                message: data.error?.message || 'Failed to get popular tags'
                            })
                        });
                    }
                }
            };

            await this.problemController.getPopularTags(mockReq as any, mockRes as any);

        } catch (error) {
            console.error('Error getting popular tags:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get popular tags', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Get categories implementation
    private async getCategories(call: any, callback: any): Promise<void> {
        try {
            const request = call.request;
            const metadata = extractMetadata(call);

            // Mock implementation - this would need to be implemented in the controller
            callback(null, {
                base: createBaseResponse(true),
                categories: [
                    { category: 'Array', count: 150 },
                    { category: 'String', count: 120 },
                    { category: 'Dynamic Programming', count: 100 },
                    { category: 'Graph', count: 80 },
                    { category: 'Tree', count: 75 }
                ]
            });

        } catch (error) {
            console.error('Error getting categories:', error);
            callback(null, {
                base: createBaseResponse(false, 'Failed to get categories', [], {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    }

    // Helper method to map problem to protobuf format
    private mapProblemToProto(problem: any): any {
        return {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty,
            category: problem.category,
            tags: problem.tags || [],
            constraints: problem.constraints || '',
            examples: (problem.examples || []).map((ex: any) => ({
                input: ex.input,
                output: ex.output,
                explanation: ex.explanation || ''
            })),
            testCases: (problem.testCases || []).map((tc: any) => ({
                id: tc.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden || false,
                weight: tc.weight || 1
            })),
            timeLimit: problem.timeLimit,
            memoryLimit: problem.memoryLimit,
            authorId: problem.authorId,
            statistics: this.mapStatisticsToProto(problem.statistics),
            createdAt: problem.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: problem.updatedAt?.toISOString() || new Date().toISOString(),
            isActive: problem.isActive !== undefined ? problem.isActive : true
        };
    }

    // Helper method to map statistics to protobuf format
    private mapStatisticsToProto(statistics: any): any {
        if (!statistics) {
            return {
                totalSubmissions: 0,
                acceptedSubmissions: 0,
                acceptanceRate: 0,
                averageRating: 0,
                totalRatings: 0
            };
        }

        return {
            totalSubmissions: statistics.totalSubmissions || 0,
            acceptedSubmissions: statistics.acceptedSubmissions || 0,
            acceptanceRate: statistics.acceptanceRate || 0,
            averageRating: statistics.averageRating || 0,
            totalRatings: statistics.totalRatings || 0
        };
    }

    // Start the gRPC server
    async start(): Promise<void> {
        await this.server.start();
        console.log(`Problem gRPC service started on port ${process.env.GRPC_PORT || 50052}`);
    }

    // Stop the gRPC server
    async stop(): Promise<void> {
        await this.server.stop();
        console.log('Problem gRPC service stopped');
    }
}