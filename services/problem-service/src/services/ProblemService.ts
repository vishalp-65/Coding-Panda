import { ProblemModel, ProblemDocument } from '../models/Problem';
import { UserProblemModel } from '../models/UserProblem';
import {
  Problem,
  CreateProblemRequest,
  UpdateProblemRequest,
  ProblemSearchCriteria,
  PaginatedResult,
} from '@ai-platform/types';
import { DatabaseUtils } from '@ai-platform/common';
import { logger } from '@ai-platform/common';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { CodeTemplateService, ProblemCodeSpec } from './CodeTemplateService';

export class ProblemService {
  private codeTemplateService: CodeTemplateService;

  constructor() {
    this.codeTemplateService = new CodeTemplateService();
  }

  // ==================== PROBLEM CRUD OPERATIONS ====================

  async createProblem(
    problemData: CreateProblemRequest & { codeSpec?: ProblemCodeSpec }
  ): Promise<Problem> {
    try {
      const slug = this.generateSlug(problemData.title);
      await this.validateUniqueSlug(slug);

      const nextNumber = await this.getNextProblemNumber();
      const testCasesWithIds = this.addTestCaseIds(problemData.testCases);
      const initialCode = problemData.codeSpec
        ? this.generateCodeTemplates(problemData.codeSpec, problemData.title)
        : undefined;

      const problem = await this.saveProblem({
        ...problemData,
        slug,
        number: nextNumber,
        testCases: testCasesWithIds,
        initialCode,
      });

      logger.info(
        `Created problem: ${problem.title} (${problem.id}) - Number: ${nextNumber}`
      );
      return problem;
    } catch (error) {
      logger.error('Error creating problem:', error);
      throw error;
    }
  }

  async createCodingProblem(
    problemData: CreateProblemRequest,
    codeSpec: ProblemCodeSpec
  ): Promise<Problem> {
    console.log({ problemData, codeSpec });
    return this.createProblem({ ...problemData, codeSpec });
  }

  async getProblemById(id: string): Promise<Problem | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      return this.toProblemOrNull(await ProblemModel.findById(id));
    } catch (error) {
      logger.error('Error getting problem by ID:', error);
      throw error;
    }
  }

  async getProblemBySlug(slug: string): Promise<Problem | null> {
    try {
      return this.toProblemOrNull(await ProblemModel.findOne({ slug }));
    } catch (error) {
      logger.error('Error getting problem by slug:', error);
      throw error;
    }
  }

  async getProblemByNumber(number: number): Promise<Problem | null> {
    try {
      return this.toProblemOrNull(await ProblemModel.findOne({ number }));
    } catch (error) {
      logger.error('Error getting problem by number:', error);
      throw error;
    }
  }

  async updateProblem(
    id: string,
    updates: UpdateProblemRequest
  ): Promise<Problem | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;

      if (updates.title) {
        const newSlug = this.generateSlug(updates.title);
        await this.validateUniqueSlug(newSlug, id);
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

      return this.toProblemOrNull(problem);
    } catch (error) {
      logger.error('Error updating problem:', error);
      throw error;
    }
  }

  async deleteProblem(id: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return false;

      const result = await ProblemModel.findByIdAndDelete(id);
      if (result) {
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

  // ==================== PROBLEM SEARCH & FILTERING ====================

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
        limit = 20,
      } = criteria;

      const pipeline = this.buildSearchPipeline({
        query,
        difficulty,
        tags,
        status,
        userId,
        sortBy,
        sortOrder,
      });

      const [problems, total] = await Promise.all([
        this.executePaginatedPipeline(pipeline, page, limit),
        this.countPipelineResults(pipeline),
      ]);

      console.log({ problems, total })

      const transformedProblems = this.transformAggregationResults(problems);

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

  async getPopularTags(
    limit: number = 20
  ): Promise<Array<{ tag: string; count: number }>> {
    try {
      return await ProblemModel.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { tag: '$_id', count: 1, _id: 0 } },
      ]);
    } catch (error) {
      logger.error('Error getting popular tags:', error);
      throw error;
    }
  }

  // ==================== PROBLEM STATISTICS ====================

  async updateProblemStatistics(
    problemId: string,
    isAccepted: boolean
  ): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(problemId)) return;

      await this.incrementSubmissionStats(problemId, isAccepted);
      await this.recalculateAcceptanceRate(problemId);
    } catch (error) {
      logger.error('Error updating problem statistics:', error);
      throw error;
    }
  }

  // ==================== USER-SPECIFIC OPERATIONS ====================

  async bookmarkProblem(userId: string, problemId: string): Promise<void> {
    try {
      await UserProblemModel.findOneAndUpdate(
        { userId, problemId },
        {
          userId,
          problemId,
          status: 'bookmarked',
          bookmarkedAt: new Date(),
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

  async rateProblem(
    userId: string,
    problemId: string,
    rating: number
  ): Promise<void> {
    try {
      this.validateRating(rating);

      const existingUserProblem = await UserProblemModel.findOne({
        userId,
        problemId,
      });
      const previousRating = existingUserProblem?.rating;

      await this.updateUserProblemRating(
        userId,
        problemId,
        rating,
        existingUserProblem?.status
      );
      await this.updateProblemAverageRating(problemId, rating, previousRating);

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

      const pipeline = this.buildBookmarkedProblemsPipeline(
        userId,
        skip,
        limit
      );
      const countPipeline = [
        { $match: { userId, status: 'bookmarked' } },
        { $count: 'total' },
      ];

      const [problems, countResult] = await Promise.all([
        UserProblemModel.aggregate(pipeline),
        UserProblemModel.aggregate(countPipeline),
      ]);

      const total = countResult[0]?.total || 0;
      const transformedProblems = this.transformAggregationResults(problems);

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

  // ==================== CODE TEMPLATES ====================

  async getProblemCodeTemplate(
    problemId: string,
    language: string
  ): Promise<any | null> {
    try {
      const problem = await this.findProblemByIdentifier(problemId);
      if (!problem) throw new Error('Problem not found');

      const initialCode = problem.initialCode as any;
      if (!initialCode) return null;

      const template = initialCode[language];
      if (!template) return null;

      return {
        userEditableRegion: template.userEditableRegion,
        hiddenCode: template.hiddenCode,
        functionSignature: template.functionSignature,
        imports: template.imports,
        helperClasses: template.helperClasses,
        language,
        problemId: problem.id,
        problemTitle: problem.title,
      };
    } catch (error) {
      logger.error('Error getting problem code template:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  async assignNumbersToExistingProblems(): Promise<void> {
    try {
      const problemsWithoutNumbers = await ProblemModel.find(
        { number: { $exists: false } },
        { _id: 1, title: 1, createdAt: 1 }
      ).sort({ createdAt: 1 });

      if (problemsWithoutNumbers.length === 0) {
        logger.info('No problems found without numbers');
        return;
      }

      let currentNumber = (await this.getNextProblemNumber()) - 1;

      for (const problem of problemsWithoutNumbers) {
        currentNumber++;
        await ProblemModel.findByIdAndUpdate(problem._id, {
          number: currentNumber,
        });
        logger.info(
          `Assigned number ${currentNumber} to problem: ${problem.title}`
        );
      }

      logger.info(
        `Successfully assigned numbers to ${problemsWithoutNumbers.length} problems`
      );
    } catch (error) {
      logger.error('Error assigning numbers to existing problems:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async getNextProblemNumber(): Promise<number> {
    try {
      const lastProblem = await ProblemModel.findOne({}, { number: 1 })
        .sort({ number: -1 })
        .lean();

      return lastProblem?.number ? lastProblem.number + 1 : 1;
    } catch (error) {
      logger.error('Error getting next problem number:', error);
      throw error;
    }
  }

  private async validateUniqueSlug(
    slug: string,
    excludeId?: string
  ): Promise<void> {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingProblem = await ProblemModel.findOne(query);
    if (existingProblem) {
      throw new Error('Problem with similar title already exists');
    }
  }

  private addTestCaseIds(testCases: any[]): any[] {
    return testCases.map(testCase => ({
      ...testCase,
      id: uuidv4(),
    }));
  }

  private generateCodeTemplates(codeSpec: ProblemCodeSpec, title: string): any {
    const templates = this.codeTemplateService.generateTemplates(codeSpec);
    logger.info(`Generated code templates for problem: ${title}`);
    return templates;
  }

  private async saveProblem(data: any): Promise<Problem> {
    const problem = new ProblemModel(data);
    const savedProblem = await problem.save();
    return savedProblem.toJSON() as Problem;
  }

  private toProblemOrNull(doc: ProblemDocument | null): Problem | null {
    return doc ? (doc.toJSON() as Problem) : null;
  }

  private buildSearchPipeline(params: {
    query?: string;
    difficulty?: string[];
    tags?: string[];
    status?: string;
    userId?: string;
    sortBy: string;
    sortOrder: string;
  }): any[] {
    const { query, difficulty, tags, status, userId, sortBy, sortOrder } =
      params;
    const pipeline: any[] = [];

    // Match stage
    const matchConditions = this.buildMatchConditions(query, difficulty, tags);
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add user status if userId provided
    if (userId) {
      pipeline.push(...this.buildUserStatusStages(userId, status));
    }

    // Sort stage
    const sortField = this.getSortField(sortBy);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    return pipeline;
  }

  private buildMatchConditions(
    query?: string,
    difficulty?: string[],
    tags?: string[]
  ): any {
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

    return matchConditions;
  }

  private buildUserStatusStages(userId: string, status?: string): any[] {
    const stages: any[] = [
      {
        $lookup: {
          from: 'userproblems',
          let: { problemId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', userId] },
                    { $eq: ['$problemId', '$$problemId'] },
                  ],
                },
              },
            },
          ],
          as: 'userProblem',
        },
      },
      {
        $addFields: {
          userStatus: {
            $cond: {
              if: { $gt: [{ $size: '$userProblem' }, 0] },
              then: { $arrayElemAt: ['$userProblem.status', 0] },
              else: null,
            },
          },
        },
      },
    ];

    // Filter by user status if specified
    if (status) {
      if (status === 'unsolved') {
        stages.push({
          $match: {
            $or: [
              { userStatus: null },
              { userStatus: { $in: ['bookmarked', 'attempted'] } },
            ],
          },
        });
      } else {
        stages.push({ $match: { userStatus: status } });
      }
    }

    return stages;
  }

  private async executePaginatedPipeline(
    pipeline: any[],
    page: number,
    limit: number
  ): Promise<any[]> {
    const skip = DatabaseUtils.calculateOffset(page, limit);
    const paginatedPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
      this.buildTestCaseFilterStage(),
    ];

    return await ProblemModel.aggregate(paginatedPipeline);
  }

  private async countPipelineResults(pipeline: any[]): Promise<number> {
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await ProblemModel.aggregate(countPipeline);
    return countResult[0]?.total || 0;
  }

  private buildTestCaseFilterStage(): any {
    return {
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
                  explanation: '$$testCase.explanation',
                },
                else: '$$testCase',
              },
            },
          },
        },
      },
    };
  }

  private transformAggregationResults(results: any[]): any[] {
    return results.map(item => {
      const transformed = {
        ...item,
        id: item._id.toString(),
      };
      delete transformed._id;
      delete transformed.__v;
      delete transformed.userProblem;
      delete transformed.initialCode;
      return transformed;
    });
  }

  private buildBookmarkedProblemsPipeline(
    userId: string,
    skip: number,
    limit: number
  ): any[] {
    return [
      { $match: { userId, status: 'bookmarked' } },
      { $sort: { bookmarkedAt: -1 } },
      { $addFields: { problemObjectId: { $toObjectId: '$problemId' } } },
      {
        $lookup: {
          from: 'problems',
          localField: 'problemObjectId',
          foreignField: '_id',
          as: 'problem',
        },
      },
      { $unwind: '$problem' },
      { $replaceRoot: { newRoot: '$problem' } },
      { $skip: skip },
      { $limit: limit },
    ];
  }

  private async incrementSubmissionStats(
    problemId: string,
    isAccepted: boolean
  ): Promise<void> {
    const updateQuery: any = {
      $inc: { 'statistics.totalSubmissions': 1 },
    };

    if (isAccepted) {
      updateQuery.$inc['statistics.acceptedSubmissions'] = 1;
    }

    await ProblemModel.findByIdAndUpdate(problemId, updateQuery);
  }

  private async recalculateAcceptanceRate(problemId: string): Promise<void> {
    const problem = await ProblemModel.findById(problemId);
    if (problem && problem.statistics.totalSubmissions > 0) {
      const acceptanceRate =
        (problem.statistics.acceptedSubmissions /
          problem.statistics.totalSubmissions) *
        100;

      await ProblemModel.findByIdAndUpdate(problemId, {
        'statistics.acceptanceRate': Math.round(acceptanceRate * 100) / 100,
      });
    }
  }

  private validateRating(rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
  }

  private async updateUserProblemRating(
    userId: string,
    problemId: string,
    rating: number,
    currentStatus?: string
  ): Promise<void> {
    await UserProblemModel.findOneAndUpdate(
      { userId, problemId },
      {
        userId,
        problemId,
        rating,
        status: currentStatus || 'attempted',
      },
      { upsert: true, new: true }
    );
  }

  private async updateProblemAverageRating(
    problemId: string,
    rating: number,
    previousRating?: number
  ): Promise<void> {
    const problem = await ProblemModel.findById(problemId);
    if (!problem) return;

    let newRatingCount = problem.statistics.ratingCount;
    let newTotalRating =
      problem.statistics.averageRating * problem.statistics.ratingCount;

    if (previousRating) {
      newTotalRating = newTotalRating - previousRating + rating;
    } else {
      newRatingCount += 1;
      newTotalRating += rating;
    }

    const newAverageRating = newTotalRating / newRatingCount;

    await ProblemModel.findByIdAndUpdate(problemId, {
      'statistics.averageRating': Math.round(newAverageRating * 100) / 100,
      'statistics.ratingCount': newRatingCount,
    });
  }

  private async findProblemByIdentifier(
    identifier: string
  ): Promise<ProblemDocument | null> {
    // Try MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      return await ProblemModel.findById(identifier);
    }

    // Try numeric problem number
    if (/^\d+$/.test(identifier)) {
      return await ProblemModel.findOne({ number: parseInt(identifier) });
    }

    // Try slug
    return await ProblemModel.findOne({ slug: identifier });
  }

  private getSortField(sortBy: string): string {
    const sortFieldMap: Record<string, string> = {
      title: 'title',
      difficulty: 'difficulty',
      acceptance_rate: 'statistics.acceptanceRate',
      created_at: 'createdAt',
    };

    return sortFieldMap[sortBy] || 'createdAt';
  }
}
