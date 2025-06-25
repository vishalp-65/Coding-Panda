import { ProblemService } from '../../src/services/ProblemService';
import { ProblemModel } from '../../src/models/Problem';
import { UserProblemModel } from '../../src/models/UserProblem';
import { CreateProblemRequest, ProblemDifficulty } from '@ai-platform/types';

describe('ProblemService', () => {
  let problemService: ProblemService;

  beforeEach(() => {
    problemService = new ProblemService();
  });

  const mockProblemData: CreateProblemRequest = {
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'easy' as ProblemDifficulty,
    tags: ['array', 'hash-table'],
    constraints: {
      timeLimit: 1000,
      memoryLimit: 128,
      inputFormat: 'First line contains array, second line contains target',
      outputFormat: 'Return array of two indices',
      sampleInput: '[2,7,11,15]\n9',
      sampleOutput: '[0,1]'
    },
    testCases: [
      {
        input: '[2,7,11,15]\n9',
        expectedOutput: '[0,1]',
        isHidden: false,
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9'
      },
      {
        input: '[3,2,4]\n6',
        expectedOutput: '[1,2]',
        isHidden: false
      },
      {
        input: '[3,3]\n6',
        expectedOutput: '[0,1]',
        isHidden: true
      }
    ]
  };

  describe('createProblem', () => {
    it('should create a problem successfully', async () => {
      const problem = await problemService.createProblem(mockProblemData);

      expect(problem).toBeDefined();
      expect(problem.title).toBe(mockProblemData.title);
      expect(problem.slug).toBe('two-sum');
      expect(problem.difficulty).toBe(mockProblemData.difficulty);
      expect(problem.tags).toEqual(mockProblemData.tags);
      expect(problem.testCases).toHaveLength(3);
      expect(problem.testCases[0].id).toBeDefined();
      expect(problem.statistics.totalSubmissions).toBe(0);
      expect(problem.statistics.acceptanceRate).toBe(0);
    });

    it('should throw error for duplicate title', async () => {
      await problemService.createProblem(mockProblemData);

      await expect(
        problemService.createProblem(mockProblemData)
      ).rejects.toThrow('Problem with similar title already exists');
    });

    it('should generate unique slugs for similar titles', async () => {
      await problemService.createProblem(mockProblemData);

      const similarProblem = {
        ...mockProblemData,
        title: 'Two Sum II'
      };

      const problem = await problemService.createProblem(similarProblem);
      expect(problem.slug).toBe('two-sum-ii');
    });
  });

  describe('getProblemById', () => {
    it('should return problem by valid ID', async () => {
      const createdProblem = await problemService.createProblem(mockProblemData);
      const foundProblem = await problemService.getProblemById(createdProblem.id);

      expect(foundProblem).toBeDefined();
      expect(foundProblem!.id).toBe(createdProblem.id);
      expect(foundProblem!.title).toBe(mockProblemData.title);
    });

    it('should return null for invalid ID', async () => {
      const problem = await problemService.getProblemById('invalid-id');
      expect(problem).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const problem = await problemService.getProblemById('507f1f77bcf86cd799439011');
      expect(problem).toBeNull();
    });
  });

  describe('getProblemBySlug', () => {
    it('should return problem by slug', async () => {
      const createdProblem = await problemService.createProblem(mockProblemData);
      const foundProblem = await problemService.getProblemBySlug('two-sum');

      expect(foundProblem).toBeDefined();
      expect(foundProblem!.id).toBe(createdProblem.id);
      expect(foundProblem!.slug).toBe('two-sum');
    });

    it('should return null for non-existent slug', async () => {
      const problem = await problemService.getProblemBySlug('non-existent');
      expect(problem).toBeNull();
    });
  });

  describe('updateProblem', () => {
    it('should update problem successfully', async () => {
      const createdProblem = await problemService.createProblem(mockProblemData);
      
      const updates = {
        title: 'Two Sum Updated',
        difficulty: 'medium' as ProblemDifficulty
      };

      const updatedProblem = await problemService.updateProblem(createdProblem.id, updates);

      expect(updatedProblem).toBeDefined();
      expect(updatedProblem!.title).toBe('Two Sum Updated');
      expect(updatedProblem!.slug).toBe('two-sum-updated');
      expect(updatedProblem!.difficulty).toBe('medium');
    });

    it('should return null for non-existent problem', async () => {
      const result = await problemService.updateProblem('507f1f77bcf86cd799439011', {
        title: 'Updated Title'
      });

      expect(result).toBeNull();
    });

    it('should throw error when updating to existing title', async () => {
      const problem1 = await problemService.createProblem(mockProblemData);
      const problem2 = await problemService.createProblem({
        ...mockProblemData,
        title: 'Three Sum'
      });

      await expect(
        problemService.updateProblem(problem2.id, { title: 'Two Sum' })
      ).rejects.toThrow('Problem with similar title already exists');
    });
  });

  describe('deleteProblem', () => {
    it('should delete problem successfully', async () => {
      const createdProblem = await problemService.createProblem(mockProblemData);
      const deleted = await problemService.deleteProblem(createdProblem.id);

      expect(deleted).toBe(true);

      const foundProblem = await problemService.getProblemById(createdProblem.id);
      expect(foundProblem).toBeNull();
    });

    it('should return false for non-existent problem', async () => {
      const deleted = await problemService.deleteProblem('507f1f77bcf86cd799439011');
      expect(deleted).toBe(false);
    });

    it('should delete related user problem records', async () => {
      const createdProblem = await problemService.createProblem(mockProblemData);
      
      // Create user problem record
      await problemService.bookmarkProblem('user123', createdProblem.id);
      
      // Verify user problem exists
      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: createdProblem.id
      });
      expect(userProblem).toBeDefined();

      // Delete problem
      await problemService.deleteProblem(createdProblem.id);

      // Verify user problem is also deleted
      const deletedUserProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: createdProblem.id
      });
      expect(deletedUserProblem).toBeNull();
    });
  });

  describe('searchProblems', () => {
    beforeEach(async () => {
      // Create test problems
      await problemService.createProblem(mockProblemData);
      await problemService.createProblem({
        ...mockProblemData,
        title: 'Three Sum',
        difficulty: 'medium' as ProblemDifficulty,
        tags: ['array', 'two-pointers']
      });
      await problemService.createProblem({
        ...mockProblemData,
        title: 'Valid Parentheses',
        difficulty: 'easy' as ProblemDifficulty,
        tags: ['string', 'stack']
      });
    });

    it('should search problems without filters', async () => {
      const result = await problemService.searchProblems({});

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter by difficulty', async () => {
      const result = await problemService.searchProblems({
        difficulty: ['easy']
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(p => p.difficulty === 'easy')).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await problemService.searchProblems({
        tags: ['array']
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(p => p.tags.includes('array'))).toBe(true);
    });

    it('should sort by title ascending', async () => {
      const result = await problemService.searchProblems({
        sortBy: 'title',
        sortOrder: 'asc'
      });

      expect(result.data[0].title).toBe('Three Sum');
      expect(result.data[1].title).toBe('Two Sum');
      expect(result.data[2].title).toBe('Valid Parentheses');
    });

    it('should paginate results', async () => {
      const result = await problemService.searchProblems({
        page: 1,
        limit: 2
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should hide sensitive test case data for hidden test cases', async () => {
      const result = await problemService.searchProblems({});
      const problem = result.data.find(p => p.title === 'Two Sum');

      expect(problem).toBeDefined();
      expect(problem!.testCases).toHaveLength(3);
      
      const hiddenTestCase = problem!.testCases.find(tc => tc.isHidden);
      expect(hiddenTestCase).toBeDefined();
      expect(hiddenTestCase!.input).toBeUndefined();
      expect(hiddenTestCase!.expectedOutput).toBeUndefined();
      expect(hiddenTestCase!.isHidden).toBe(true);
    });
  });

  describe('getPopularTags', () => {
    beforeEach(async () => {
      await problemService.createProblem(mockProblemData); // array, hash-table
      await problemService.createProblem({
        ...mockProblemData,
        title: 'Three Sum',
        tags: ['array', 'two-pointers']
      });
      await problemService.createProblem({
        ...mockProblemData,
        title: 'Valid Parentheses',
        tags: ['string', 'stack']
      });
    });

    it('should return popular tags with counts', async () => {
      const tags = await problemService.getPopularTags();

      expect(tags).toHaveLength(5);
      
      const arrayTag = tags.find(t => t.tag === 'array');
      expect(arrayTag).toBeDefined();
      expect(arrayTag!.count).toBe(2);

      const stringTag = tags.find(t => t.tag === 'string');
      expect(stringTag).toBeDefined();
      expect(stringTag!.count).toBe(1);
    });

    it('should limit results', async () => {
      const tags = await problemService.getPopularTags(2);
      expect(tags).toHaveLength(2);
    });

    it('should sort by count descending', async () => {
      const tags = await problemService.getPopularTags();
      expect(tags[0].tag).toBe('array');
      expect(tags[0].count).toBe(2);
    });
  });

  describe('updateProblemStatistics', () => {
    it('should update statistics for accepted submission', async () => {
      const problem = await problemService.createProblem(mockProblemData);

      await problemService.updateProblemStatistics(problem.id, true);

      const updatedProblem = await problemService.getProblemById(problem.id);
      expect(updatedProblem!.statistics.totalSubmissions).toBe(1);
      expect(updatedProblem!.statistics.acceptedSubmissions).toBe(1);
      expect(updatedProblem!.statistics.acceptanceRate).toBe(100);
    });

    it('should update statistics for rejected submission', async () => {
      const problem = await problemService.createProblem(mockProblemData);

      await problemService.updateProblemStatistics(problem.id, false);

      const updatedProblem = await problemService.getProblemById(problem.id);
      expect(updatedProblem!.statistics.totalSubmissions).toBe(1);
      expect(updatedProblem!.statistics.acceptedSubmissions).toBe(0);
      expect(updatedProblem!.statistics.acceptanceRate).toBe(0);
    });

    it('should calculate correct acceptance rate', async () => {
      const problem = await problemService.createProblem(mockProblemData);

      // 2 accepted, 3 rejected
      await problemService.updateProblemStatistics(problem.id, true);
      await problemService.updateProblemStatistics(problem.id, true);
      await problemService.updateProblemStatistics(problem.id, false);
      await problemService.updateProblemStatistics(problem.id, false);
      await problemService.updateProblemStatistics(problem.id, false);

      const updatedProblem = await problemService.getProblemById(problem.id);
      expect(updatedProblem!.statistics.totalSubmissions).toBe(5);
      expect(updatedProblem!.statistics.acceptedSubmissions).toBe(2);
      expect(updatedProblem!.statistics.acceptanceRate).toBe(40);
    });
  });

  describe('bookmarkProblem', () => {
    it('should bookmark a problem', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      await problemService.bookmarkProblem('user123', problem.id);

      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problem.id
      });

      expect(userProblem).toBeDefined();
      expect(userProblem!.status).toBe('bookmarked');
      expect(userProblem!.bookmarkedAt).toBeDefined();
    });

    it('should update existing user problem record', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      // Create initial record
      await UserProblemModel.create({
        userId: 'user123',
        problemId: problem.id,
        status: 'attempted',
        attempts: 1
      });

      await problemService.bookmarkProblem('user123', problem.id);

      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problem.id
      });

      expect(userProblem!.status).toBe('bookmarked');
      expect(userProblem!.bookmarkedAt).toBeDefined();
      expect(userProblem!.attempts).toBe(1); // Should preserve existing data
    });
  });

  describe('unbookmarkProblem', () => {
    it('should remove bookmark-only record', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      await problemService.bookmarkProblem('user123', problem.id);
      await problemService.unbookmarkProblem('user123', problem.id);

      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problem.id
      });

      expect(userProblem).toBeNull();
    });

    it('should remove bookmark from existing record', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      // Create record with multiple statuses
      await UserProblemModel.create({
        userId: 'user123',
        problemId: problem.id,
        status: 'solved',
        bookmarkedAt: new Date(),
        solvedAt: new Date()
      });

      await problemService.unbookmarkProblem('user123', problem.id);

      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problem.id
      });

      expect(userProblem).toBeDefined();
      expect(userProblem!.status).toBe('solved');
      expect(userProblem!.bookmarkedAt).toBeUndefined();
      expect(userProblem!.solvedAt).toBeDefined();
    });
  });

  describe('rateProblem', () => {
    it('should rate a problem for the first time', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      await problemService.rateProblem('user123', problem.id, 4);

      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problem.id
      });

      expect(userProblem!.rating).toBe(4);

      const updatedProblem = await problemService.getProblemById(problem.id);
      expect(updatedProblem!.statistics.averageRating).toBe(4);
      expect(updatedProblem!.statistics.ratingCount).toBe(1);
    });

    it('should update existing rating', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      await problemService.rateProblem('user123', problem.id, 3);
      await problemService.rateProblem('user123', problem.id, 5);

      const updatedProblem = await problemService.getProblemById(problem.id);
      expect(updatedProblem!.statistics.averageRating).toBe(5);
      expect(updatedProblem!.statistics.ratingCount).toBe(1);
    });

    it('should calculate average rating correctly', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      await problemService.rateProblem('user1', problem.id, 5);
      await problemService.rateProblem('user2', problem.id, 3);
      await problemService.rateProblem('user3', problem.id, 4);

      const updatedProblem = await problemService.getProblemById(problem.id);
      expect(updatedProblem!.statistics.averageRating).toBe(4);
      expect(updatedProblem!.statistics.ratingCount).toBe(3);
    });

    it('should throw error for invalid rating', async () => {
      const problem = await problemService.createProblem(mockProblemData);
      
      await expect(
        problemService.rateProblem('user123', problem.id, 0)
      ).rejects.toThrow('Rating must be between 1 and 5');

      await expect(
        problemService.rateProblem('user123', problem.id, 6)
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('getUserBookmarkedProblems', () => {
    beforeEach(async () => {
      const problem1 = await problemService.createProblem(mockProblemData);
      const problem2 = await problemService.createProblem({
        ...mockProblemData,
        title: 'Three Sum'
      });
      const problem3 = await problemService.createProblem({
        ...mockProblemData,
        title: 'Valid Parentheses'
      });

      await problemService.bookmarkProblem('user123', problem1.id);
      await problemService.bookmarkProblem('user123', problem2.id);
      
      // Different user
      await problemService.bookmarkProblem('user456', problem3.id);
    });

    it('should return user bookmarked problems', async () => {
      const result = await problemService.getUserBookmarkedProblems('user123');

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      
      const titles = result.data.map(p => p.title);
      expect(titles).toContain('Two Sum');
      expect(titles).toContain('Three Sum');
      expect(titles).not.toContain('Valid Parentheses');
    });

    it('should paginate bookmarked problems', async () => {
      const result = await problemService.getUserBookmarkedProblems('user123', 1, 1);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should return empty result for user with no bookmarks', async () => {
      const result = await problemService.getUserBookmarkedProblems('user789');

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });
});