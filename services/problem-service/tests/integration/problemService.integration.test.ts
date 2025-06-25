import request from 'supertest';
import express from 'express';
import { problemRoutes } from '../../src/routes/problemRoutes';
import { connectToDatabase, disconnectFromDatabase } from '../../src/config/database';
import { ProblemModel } from '../../src/models/Problem';
import { UserProblemModel } from '../../src/models/UserProblem';
import { CreateProblemRequest, ProblemDifficulty } from '@ai-platform/types';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req: any, res, next) => {
  req.user = { id: 'user123' };
  req.validatedBody = req.body;
  req.validatedQuery = req.query;
  next();
});

app.use('/api/problems', problemRoutes);

describe('Problem Service Integration Tests', () => {
  const mockProblemData: CreateProblemRequest = {
    title: 'Two Sum Integration Test',
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

  describe('Complete Problem Workflow', () => {
    let problemId: string;

    it('should create, retrieve, update, and delete a problem', async () => {
      // Create problem
      const createResponse = await request(app)
        .post('/api/problems')
        .send(mockProblemData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(mockProblemData.title);
      expect(createResponse.body.data.slug).toBe('two-sum-integration-test');
      
      problemId = createResponse.body.data.id;

      // Retrieve problem by ID
      const getByIdResponse = await request(app)
        .get(`/api/problems/${problemId}`)
        .expect(200);

      expect(getByIdResponse.body.success).toBe(true);
      expect(getByIdResponse.body.data.title).toBe(mockProblemData.title);

      // Retrieve problem by slug
      const getBySlugResponse = await request(app)
        .get('/api/problems/two-sum-integration-test')
        .expect(200);

      expect(getBySlugResponse.body.success).toBe(true);
      expect(getBySlugResponse.body.data.id).toBe(problemId);

      // Update problem
      const updateData = {
        title: 'Two Sum Updated',
        difficulty: 'medium' as ProblemDifficulty
      };

      const updateResponse = await request(app)
        .put(`/api/problems/${problemId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe('Two Sum Updated');
      expect(updateResponse.body.data.difficulty).toBe('medium');
      expect(updateResponse.body.data.slug).toBe('two-sum-updated');

      // Search for updated problem
      const searchResponse = await request(app)
        .get('/api/problems/search?query=updated')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].title).toBe('Two Sum Updated');

      // Delete problem
      const deleteResponse = await request(app)
        .delete(`/api/problems/${problemId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      await request(app)
        .get(`/api/problems/${problemId}`)
        .expect(404);
    });
  });

  describe('User Problem Interactions', () => {
    let problemId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/problems')
        .send(mockProblemData);
      
      problemId = createResponse.body.data.id;
    });

    it('should handle bookmark workflow', async () => {
      // Bookmark problem
      await request(app)
        .post(`/api/problems/${problemId}/bookmark`)
        .expect(200);

      // Verify bookmark in database
      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problemId
      });

      expect(userProblem).toBeDefined();
      expect(userProblem!.status).toBe('bookmarked');

      // Get bookmarked problems
      const bookmarksResponse = await request(app)
        .get('/api/problems/bookmarks')
        .expect(200);

      expect(bookmarksResponse.body.success).toBe(true);
      expect(bookmarksResponse.body.data).toHaveLength(1);
      expect(bookmarksResponse.body.data[0].id).toBe(problemId);

      // Unbookmark problem
      await request(app)
        .delete(`/api/problems/${problemId}/bookmark`)
        .expect(200);

      // Verify unbookmark
      const bookmarksAfterRemoval = await request(app)
        .get('/api/problems/bookmarks')
        .expect(200);

      expect(bookmarksAfterRemoval.body.data).toHaveLength(0);
    });

    it('should handle rating workflow', async () => {
      // Rate problem
      await request(app)
        .post(`/api/problems/${problemId}/rate`)
        .send({ rating: 4 })
        .expect(200);

      // Verify rating in database
      const userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problemId
      });

      expect(userProblem!.rating).toBe(4);

      // Verify problem statistics updated
      const problem = await ProblemModel.findById(problemId);
      expect(problem!.statistics.averageRating).toBe(4);
      expect(problem!.statistics.ratingCount).toBe(1);

      // Update rating
      await request(app)
        .post(`/api/problems/${problemId}/rate`)
        .send({ rating: 5 })
        .expect(200);

      // Verify updated rating
      const updatedProblem = await ProblemModel.findById(problemId);
      expect(updatedProblem!.statistics.averageRating).toBe(5);
      expect(updatedProblem!.statistics.ratingCount).toBe(1);
    });

    it('should update problem statistics', async () => {
      // Update statistics for accepted submission
      await request(app)
        .post(`/api/problems/${problemId}/statistics`)
        .send({ isAccepted: true })
        .expect(200);

      let problem = await ProblemModel.findById(problemId);
      expect(problem!.statistics.totalSubmissions).toBe(1);
      expect(problem!.statistics.acceptedSubmissions).toBe(1);
      expect(problem!.statistics.acceptanceRate).toBe(100);

      // Update statistics for rejected submission
      await request(app)
        .post(`/api/problems/${problemId}/statistics`)
        .send({ isAccepted: false })
        .expect(200);

      problem = await ProblemModel.findById(problemId);
      expect(problem!.statistics.totalSubmissions).toBe(2);
      expect(problem!.statistics.acceptedSubmissions).toBe(1);
      expect(problem!.statistics.acceptanceRate).toBe(50);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test problems
      const problems = [
        {
          ...mockProblemData,
          title: 'Easy Array Problem',
          difficulty: 'easy' as ProblemDifficulty,
          tags: ['array', 'sorting']
        },
        {
          ...mockProblemData,
          title: 'Medium String Problem',
          difficulty: 'medium' as ProblemDifficulty,
          tags: ['string', 'dynamic-programming']
        },
        {
          ...mockProblemData,
          title: 'Hard Graph Problem',
          difficulty: 'hard' as ProblemDifficulty,
          tags: ['graph', 'dfs']
        }
      ];

      for (const problem of problems) {
        await request(app)
          .post('/api/problems')
          .send(problem);
      }
    });

    it('should search problems by text query', async () => {
      const response = await request(app)
        .get('/api/problems/search?query=array')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const hasArrayProblem = response.body.data.some((p: any) => 
        p.title.toLowerCase().includes('array')
      );
      expect(hasArrayProblem).toBe(true);
    });

    it('should filter problems by difficulty', async () => {
      const response = await request(app)
        .get('/api/problems/search?difficulty=easy&difficulty=medium')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const allEasyOrMedium = response.body.data.every((p: any) => 
        p.difficulty === 'easy' || p.difficulty === 'medium'
      );
      expect(allEasyOrMedium).toBe(true);
    });

    it('should filter problems by tags', async () => {
      const response = await request(app)
        .get('/api/problems/search?tags=array')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const allHaveArrayTag = response.body.data.every((p: any) => 
        p.tags.includes('array')
      );
      expect(allHaveArrayTag).toBe(true);
    });

    it('should sort problems by title', async () => {
      const response = await request(app)
        .get('/api/problems/search?sortBy=title&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const titles = response.body.data.map((p: any) => p.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/problems/search?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should get popular tags', async () => {
      const response = await request(app)
        .get('/api/problems/tags/popular?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify structure
      response.body.data.forEach((tag: any) => {
        expect(tag).toHaveProperty('tag');
        expect(tag).toHaveProperty('count');
        expect(typeof tag.count).toBe('number');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate problem creation', async () => {
      // Create first problem
      await request(app)
        .post('/api/problems')
        .send(mockProblemData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/problems')
        .send(mockProblemData)
        .expect(409);

      expect(response.body.error.code).toBe('PROBLEM_EXISTS');
    });

    it('should handle invalid problem ID', async () => {
      const response = await request(app)
        .get('/api/problems/invalid-id')
        .expect(404);

      expect(response.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });

    it('should handle non-existent problem operations', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      // Try to update non-existent problem
      await request(app)
        .put(`/api/problems/${nonExistentId}`)
        .send({ title: 'Updated' })
        .expect(404);

      // Try to delete non-existent problem
      await request(app)
        .delete(`/api/problems/${nonExistentId}`)
        .expect(404);
    });

    it('should validate rating values', async () => {
      const createResponse = await request(app)
        .post('/api/problems')
        .send(mockProblemData);
      
      const problemId = createResponse.body.data.id;

      // Invalid rating (too low)
      await request(app)
        .post(`/api/problems/${problemId}/rate`)
        .send({ rating: 0 })
        .expect(400);

      // Invalid rating (too high)
      await request(app)
        .post(`/api/problems/${problemId}/rate`)
        .send({ rating: 6 })
        .expect(400);

      // Missing rating
      await request(app)
        .post(`/api/problems/${problemId}/rate`)
        .send({})
        .expect(400);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity when deleting problems', async () => {
      // Create problem
      const createResponse = await request(app)
        .post('/api/problems')
        .send(mockProblemData);
      
      const problemId = createResponse.body.data.id;

      // Create user interactions
      await request(app)
        .post(`/api/problems/${problemId}/bookmark`)
        .expect(200);

      await request(app)
        .post(`/api/problems/${problemId}/rate`)
        .send({ rating: 4 })
        .expect(200);

      // Verify user problem record exists
      let userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problemId
      });
      expect(userProblem).toBeDefined();

      // Delete problem
      await request(app)
        .delete(`/api/problems/${problemId}`)
        .expect(200);

      // Verify user problem record is also deleted
      userProblem = await UserProblemModel.findOne({
        userId: 'user123',
        problemId: problemId
      });
      expect(userProblem).toBeNull();
    });

    it('should handle concurrent rating updates correctly', async () => {
      // Create problem
      const createResponse = await request(app)
        .post('/api/problems')
        .send(mockProblemData);
      
      const problemId = createResponse.body.data.id;

      // Simulate concurrent ratings from different users
      const ratingPromises = [
        request(app).post(`/api/problems/${problemId}/rate`).send({ rating: 5 }),
        request(app).post(`/api/problems/${problemId}/rate`).send({ rating: 3 }),
        request(app).post(`/api/problems/${problemId}/rate`).send({ rating: 4 })
      ];

      // Note: These will all be from the same user due to our mock middleware
      // In a real scenario, they would be from different users
      await Promise.all(ratingPromises);

      // Verify final state
      const problem = await ProblemModel.findById(problemId);
      expect(problem!.statistics.ratingCount).toBe(1); // Same user, so only 1 rating
      expect(problem!.statistics.averageRating).toBe(4); // Last rating wins
    });
  });
});