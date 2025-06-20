import { ProblemModel, ProblemDocument } from '../models/Problem';
import { UserProblemModel, UserProblemDocument } from '../models/UserProblem';
import { 
  Problem, 
  CreateProblemRequest, 
  UpdateProblemRequest, 
  ProblemSearchCriteria,
  PaginatedResult
} from '@ai-platform/types';
import { DatabaseUtils } from '@ai-platform/common';
import { logger } from '@ai-platform/common';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export class ProblemService {
  async createProblem(problemData: CreateProblemRequest): Promise<Problem> {
    try {
      const slug = this.generateSlug(problemData.title);
      
      // Check if slug already exists
      const existingProblem = await ProblemModel.findOne({ slug });
      if (existingProblem) {
        throw new Error('Problem with similar title already exists');
      }

      // Add IDs to test cases
      const testCasesWithIds = problemData.testCases.map(testCase => ({
        ...testCase,
        id: uuidv4()
      }));

      const problem = new ProblemModel({
        ...problemData,
        slug,
        testCases: testCasesWithIds
      });

      const savedProblem = await problem.save();
      logger.info(`Created problem: ${savedProblem.title} (${savedProblem.id})`);
      
      return savedProblem.toJSON() as Problem;
    } catch (error) {
      logger.error('Error creating problem:', error);
      throw error;
    }
  }

  async getProblemById(id: string): Promise<Problem | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }

      const problem = await ProblemModel.findById(id);
      return problem ? problem.toJSON() as Problem : null;
    } catch (error) {
      logger.error('Error getting problem by ID:', error);
      throw error;
    }
  }

  async getProblemBySlug(slug: string): Promise<Problem | null> {
    try {
      const problem = await ProblemModel.findOne({ slug });
      return problem ? problem.toJSON() as Problem : null;
    } catch (error) {
      logger.error('Error getting problem by slug:', error);
      throw error;
    }
  }

  async updateProblem(id: string, updates: UpdateProblemRequest): Promise<Problem | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }

      // If title is being updated, generate new slug
      if (updates.title) {
        const newSlug = this.generateSlug(updates.title);
        const existingProblem = await ProblemModel.findOne({ 
          slug: newSlug, 
          _id: { $ne: id } 
        });
        
        if (existingProblem) {
          throw new Error('Problem with similar title already exists');
        }
        
        (updates as any).slug = newSlug;
      }

      const problem = await ProblemModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (problem) {
        logger.info(`Updated problem: ${problem.title} (${problem.id})`);
      }

      return problem ? problem.toJSON() as Problem : null;
    } catch (error) {
      logger.error('Error updating problem:', error);
      throw error;
    }
  }

  async deleteProblem(id: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return false;
      }

      const result = await ProblemModel.findByIdAndDelete(id);
      
      if (result) {
        // Also delete related user problem records
        await UserProblemModel.deleteMany({ problemId: id });
        logger.info(`Deleted problem: ${result.title} (${id})`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error deleting problem:', error);
      throw error;
    }
  }

  async searchProblems(
    criteria: ProblemSearchCriteria,
    userId?: string
  ): Promise<PaginatedResult<Problem & { userStatus?: string }>> {
    try {
      const {
        query,
        difficulty,
        tags,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = criteria;

      // Build MongoDB aggregation pipeline
      const pipeline: any[] = [];

      // Match stage
      const matchConditions: any = {};

      if (query) {
        matchConditions.$text = { $search: query };
      }

      if (difficulty && difficulty.length > 0) {
        matchConditions.difficulty = { $in: difficulty };
      }

      if (tags && tags.length > 0) {
        matchConditions.tags = { $in: tags };
      }

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }

      // Add user status if userId provided
      if (userId) {
        pipeline.push({
          $lookup: {
            from: 'userproblems',
            let: { problemId: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', userId] },
                      { $eq: ['$problemId', '$$problemId'] }
                    ]
                  }
                }
              }
            ],
            as: 'userProblem'
          }
        });

        pipeline.push({
          $addFields: {
            userStatus: {
              $cond: {
                if: { $gt: [{ $size: '$userProblem' }, 0] },
                then: { $arrayElemAt: ['$userProblem.status', 0] },
                else: null
              }
            }
          }
        });

        // Filter by user status if specified
        if (status) {
          if (status === 'unsolved') {
            pipeline.push({
              $match: {
                $or: [
                  { userStatus: null },
                  { userStatus: { $in: ['bookmarked', 'attempted'] } }
                ]
              }
            });
          } else {
            pipeline.push({
              $match: { userStatus: status }
            });
          }
        }
      }

      // Sort stage
      const sortField = this.getSortField(sortBy);
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      pipeline.push({ $sort: { [sortField]: sortDirection } });

      // Count total documents
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await ProblemModel.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      // Add pagination
      const skip = DatabaseUtils.calculateOffset(page, limit);
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Remove sensitive data for non-hidden test cases only
      pipeline.push({
        $addFields: {
          testCases: {
            $map: {
              input: '$testCases',
              as: 'testCase',
              in: {
                $cond: {
                  if: '$$testCase.isHidden',
                  then: {
                    id: '$$testCase.id',
                    isHidden: true,
                    explanation: '$$testCase.explanation'
                  },
                  else: '$$testCase'
                }
              }
            }
          }
        }
      });

      // Execute aggregation
      const problems = await ProblemModel.aggregate(pipeline);

      // Transform results
      const transformedProblems = problems.map(problem => {
        const transformed = {
          ...problem,
          id: problem._id.toString()
        };
        delete transformed._id;
        delete transformed.__v;
        delete transformed.userProblem;
        return transformed;
      });

      return DatabaseUtils.createPaginatedResult(
        transformedProblems,
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Error searching problems:', error);
      throw error;
    }
  }

  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    try {
      const pipeline: any[] = [
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { tag: '$_id', count: 1, _id: 0 } }
      ];

      return await ProblemModel.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting popular tags:', error);
      throw error;
    }
  }

  async updateProblemStatistics(
    problemId: string, 
    isAccepted: boolean
  ): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(problemId)) {
        return;
      }

      const updateQuery: any = {
        $inc: { 'statistics.totalSubmissions': 1 }
      };

      if (isAccepted) {
        updateQuery.$inc['statistics.acceptedSubmissions'] = 1;
      }

      await ProblemModel.findByIdAndUpdate(problemId, updateQuery);

      // Recalculate acceptance rate
      const problem = await ProblemModel.findById(problemId);
      if (problem && problem.statistics.totalSubmissions > 0) {
        const acceptanceRate = (problem.statistics.acceptedSubmissions / problem.statistics.totalSubmissions) * 100;
        await ProblemModel.findByIdAndUpdate(problemId, {
          'statistics.acceptanceRate': Math.round(acceptanceRate * 100) / 100
        });
      }
    } catch (error) {
      logger.error('Error updating problem statistics:', error);
      throw error;
    }
  }

  // User-specific problem operations
  async bookmarkProblem(userId: string, problemId: string): Promise<void> {
    try {
      await UserProblemModel.findOneAndUpdate(
        { userId, problemId },
        {
          userId,
          problemId,
          status: 'bookmarked',
          bookmarkedAt: new Date()
        },
        { upsert: true, new: true }
      );

      logger.info(`User ${userId} bookmarked problem ${problemId}`);
    } catch (error) {
      logger.error('Error bookmarking problem:', error);
      throw error;
    }
  }

  async unbookmarkProblem(userId: string, problemId: string): Promise<void> {
    try {
      const userProblem = await UserProblemModel.findOne({ userId, problemId });
      
      if (userProblem) {
        if (userProblem.status === 'bookmarked') {
          await UserProblemModel.findOneAndDelete({ userId, problemId });
        } else {
          // Keep the record but remove bookmark status
          await UserProblemModel.findOneAndUpdate(
            { userId, problemId },
            { $unset: { bookmarkedAt: 1 } }
          );
        }
      }

      logger.info(`User ${userId} unbookmarked problem ${problemId}`);
    } catch (error) {
      logger.error('Error unbookmarking problem:', error);
      throw error;
    }
  }

  async rateProblem(userId: string, problemId: string, rating: number): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const existingUserProblem = await UserProblemModel.findOne({ userId, problemId });
      const previousRating = existingUserProblem?.rating;

      // Update user problem record
      await UserProblemModel.findOneAndUpdate(
        { userId, problemId },
        {
          userId,
          problemId,
          rating,
          status: existingUserProblem?.status || 'attempted'
        },
        { upsert: true, new: true }
      );

      // Update problem statistics
      const problem = await ProblemModel.findById(problemId);
      if (problem) {
        let newRatingCount = problem.statistics.ratingCount;
        let newTotalRating = problem.statistics.averageRating * problem.statistics.ratingCount;

        if (previousRating) {
          // Replace existing rating
          newTotalRating = newTotalRating - previousRating + rating;
        } else {
          // Add new rating
          newRatingCount += 1;
          newTotalRating += rating;
        }

        const newAverageRating = newTotalRating / newRatingCount;

        await ProblemModel.findByIdAndUpdate(problemId, {
          'statistics.averageRating': Math.round(newAverageRating * 100) / 100,
          'statistics.ratingCount': newRatingCount
        });
      }

      logger.info(`User ${userId} rated problem ${problemId}: ${rating}`);
    } catch (error) {
      logger.error('Error rating problem:', error);
      throw error;
    }
  }

  async getUserBookmarkedProblems(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResult<Problem>> {
    try {
      const skip = DatabaseUtils.calculateOffset(page, limit);

      const pipeline: any[] = [
        { $match: { userId, status: 'bookmarked' } },
        { $sort: { bookmarkedAt: -1 } },
        {
          $addFields: {
            problemObjectId: { $toObjectId: '$problemId' }
          }
        },
        {
          $lookup: {
            from: 'problems',
            localField: 'problemObjectId',
            foreignField: '_id',
            as: 'problem'
          }
        },
        { $unwind: '$problem' },
        { $replaceRoot: { newRoot: '$problem' } },
        { $skip: skip },
        { $limit: limit }
      ];

      const countPipeline: any[] = [
        { $match: { userId, status: 'bookmarked' } },
        { $count: 'total' }
      ];

      const [problems, countResult] = await Promise.all([
        UserProblemModel.aggregate(pipeline),
        UserProblemModel.aggregate(countPipeline)
      ]);

      const total = countResult[0]?.total || 0;

      const transformedProblems = problems.map(problem => ({
        ...problem,
        id: problem._id.toString(),
        _id: undefined,
        __v: undefined
      }));

      return DatabaseUtils.createPaginatedResult(
        transformedProblems,
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Error getting user bookmarked problems:', error);
      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private getSortField(sortBy: string): string {
    const sortFieldMap: Record<string, string> = {
      'title': 'title',
      'difficulty': 'difficulty',
      'acceptance_rate': 'statistics.acceptanceRate',
      'created_at': 'createdAt'
    };

    return sortFieldMap[sortBy] || 'createdAt';
  }
}