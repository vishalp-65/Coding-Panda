import request from 'supertest';
import express from 'express';
import { problemRoutes } from '../../src/routes/problemRoutes';
import { ProblemService } from '../../src/services/ProblemService';
import { CreateProblemRequest, ProblemDifficulty } from '@ai-platform/types';

// Mock the ProblemService
jest.mock('../../src/services/ProblemService');

const app = express();
app.use(express.json());
app.use('/api/problems', problemRoutes);

// Mock authentication middleware
app.use((req: any, res, next) => {
  req.user = { id: 'user123' };
  next();
});

const MockedProblemService = ProblemService as jest.MockedClass<
  typeof ProblemService
>;

describe('ProblemController', () => {
  let mockProblemService: jest.Mocked<ProblemService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProblemService =
      new MockedProblemService() as jest.Mocked<ProblemService>;
    (ProblemService as any).mockImplementation(() => mockProblemService);
  });

  const mockProblemData: CreateProblemRequest = {
    title: 'Two Sum',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'easy' as ProblemDifficulty,
    tags: ['array', 'hash-table'],
    constraints: {
      timeLimit: 1000,
      memoryLimit: 128,
      inputFormat: 'First line contains array, second line contains target',
      outputFormat: 'Return array of two indices',
    },
    testCases: [
      {
        input: '[2,7,11,15]\n9',
        expectedOutput: '[0,1]',
        isHidden: false,
      },
    ],
  };

  const mockProblem = {
    id: '507f1f77bcf86cd799439011',
    ...mockProblemData,
    slug: 'two-sum',
    statistics: {
      totalSubmissions: 0,
      acceptedSubmissions: 0,
      acceptanceRate: 0,
      averageRating: 0,
      ratingCount: 0,
      difficultyVotes: { easy: 0, medium: 0, hard: 0 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('POST /api/problems', () => {
    it('should create a problem successfully', async () => {
      mockProblemService.createProblem.mockResolvedValue(mockProblem as any);

      const response = await request(app)
        .post('/api/problems')
        .send(mockProblemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(mockProblemData.title);
      expect(response.body.message).toBe('Problem created successfully');
      expect(mockProblemService.createProblem).toHaveBeenCalledWith(
        mockProblemData
      );
    });

    it('should return 409 for duplicate problem', async () => {
      mockProblemService.createProblem.mockRejectedValue(
        new Error('Problem with similar title already exists')
      );

      const response = await request(app)
        .post('/api/problems')
        .send(mockProblemData)
        .expect(409);

      expect(response.body.error.code).toBe('PROBLEM_EXISTS');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = { ...mockProblemData, title: '' };

      const response = await request(app)
        .post('/api/problems')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 for internal error', async () => {
      mockProblemService.createProblem.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/problems')
        .send(mockProblemData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/problems/:id', () => {
    it('should get problem by ID', async () => {
      mockProblemService.getProblemById.mockResolvedValue(mockProblem as any);

      const response = await request(app)
        .get('/api/problems/507f1f77bcf86cd799439011')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(mockProblem.title);
      expect(mockProblemService.getProblemById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011'
      );
    });

    it('should get problem by slug', async () => {
      mockProblemService.getProblemById.mockResolvedValue(null);
      mockProblemService.getProblemBySlug.mockResolvedValue(mockProblem as any);

      const response = await request(app)
        .get('/api/problems/two-sum')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(mockProblem.title);
      expect(mockProblemService.getProblemBySlug).toHaveBeenCalledWith(
        'two-sum'
      );
    });

    it('should return 404 for non-existent problem', async () => {
      mockProblemService.getProblemById.mockResolvedValue(null);
      mockProblemService.getProblemBySlug.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/problems/non-existent')
        .expect(404);

      expect(response.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('PUT /api/problems/:id', () => {
    it('should update problem successfully', async () => {
      const updatedProblem = { ...mockProblem, title: 'Updated Title' };
      mockProblemService.updateProblem.mockResolvedValue(updatedProblem as any);

      const response = await request(app)
        .put('/api/problems/507f1f77bcf86cd799439011')
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(mockProblemService.updateProblem).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { title: 'Updated Title' }
      );
    });

    it('should return 404 for non-existent problem', async () => {
      mockProblemService.updateProblem.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/problems/507f1f77bcf86cd799439011')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('DELETE /api/problems/:id', () => {
    it('should delete problem successfully', async () => {
      mockProblemService.deleteProblem.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/problems/507f1f77bcf86cd799439011')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Problem deleted successfully');
      expect(mockProblemService.deleteProblem).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011'
      );
    });

    it('should return 404 for non-existent problem', async () => {
      mockProblemService.deleteProblem.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/problems/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('GET /api/problems/search', () => {
    it('should search problems successfully', async () => {
      const mockResult = {
        data: [mockProblem],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockProblemService.searchProblems.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get('/api/problems/search?difficulty=easy&tags=array')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
      expect(mockProblemService.searchProblems).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: ['easy'],
          tags: ['array'],
        }),
        'user123'
      );
    });

    it('should handle search with no results', async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockProblemService.searchProblems.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get('/api/problems/search?query=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/problems/tags/popular', () => {
    it('should get popular tags', async () => {
      const mockTags = [
        { tag: 'array', count: 10 },
        { tag: 'string', count: 8 },
      ];

      mockProblemService.getPopularTags.mockResolvedValue(mockTags);

      const response = await request(app)
        .get('/api/problems/tags/popular?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTags);
      expect(mockProblemService.getPopularTags).toHaveBeenCalledWith(10);
    });
  });

  describe('POST /api/problems/:id/bookmark', () => {
    it('should bookmark problem successfully', async () => {
      mockProblemService.bookmarkProblem.mockResolvedValue();

      const response = await request(app)
        .post('/api/problems/507f1f77bcf86cd799439011/bookmark')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Problem bookmarked successfully');
      expect(mockProblemService.bookmarkProblem).toHaveBeenCalledWith(
        'user123',
        '507f1f77bcf86cd799439011'
      );
    });
  });

  describe('DELETE /api/problems/:id/bookmark', () => {
    it('should unbookmark problem successfully', async () => {
      mockProblemService.unbookmarkProblem.mockResolvedValue();

      const response = await request(app)
        .delete('/api/problems/507f1f77bcf86cd799439011/bookmark')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Problem unbookmarked successfully');
      expect(mockProblemService.unbookmarkProblem).toHaveBeenCalledWith(
        'user123',
        '507f1f77bcf86cd799439011'
      );
    });
  });

  describe('POST /api/problems/:id/rate', () => {
    it('should rate problem successfully', async () => {
      mockProblemService.rateProblem.mockResolvedValue();

      const response = await request(app)
        .post('/api/problems/507f1f77bcf86cd799439011/rate')
        .send({ rating: 4 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Problem rated successfully');
      expect(mockProblemService.rateProblem).toHaveBeenCalledWith(
        'user123',
        '507f1f77bcf86cd799439011',
        4
      );
    });

    it('should return 400 for invalid rating', async () => {
      const response = await request(app)
        .post('/api/problems/507f1f77bcf86cd799439011/rate')
        .send({ rating: 6 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for service validation error', async () => {
      mockProblemService.rateProblem.mockRejectedValue(
        new Error('Rating must be between 1 and 5')
      );

      const response = await request(app)
        .post('/api/problems/507f1f77bcf86cd799439011/rate')
        .send({ rating: 3 })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_RATING');
    });
  });

  describe('GET /api/problems/bookmarks', () => {
    it('should get user bookmarked problems', async () => {
      const mockResult = {
        data: [mockProblem],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockProblemService.getUserBookmarkedProblems.mockResolvedValue(
        mockResult as any
      );

      const response = await request(app)
        .get('/api/problems/bookmarks?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockProblemService.getUserBookmarkedProblems).toHaveBeenCalledWith(
        'user123',
        1,
        10
      );
    });
  });

  describe('POST /api/problems/:id/statistics', () => {
    it('should update problem statistics', async () => {
      mockProblemService.updateProblemStatistics.mockResolvedValue();

      const response = await request(app)
        .post('/api/problems/507f1f77bcf86cd799439011/statistics')
        .send({ isAccepted: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Problem statistics updated successfully'
      );
      expect(mockProblemService.updateProblemStatistics).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        true
      );
    });
  });
});
