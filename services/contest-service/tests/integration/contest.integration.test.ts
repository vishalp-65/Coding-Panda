import request from 'supertest';
import { createApp } from '../../src/app';
import { ContestStatus, ScoringType } from '../../src/types/contest.types';
import jwt from 'jsonwebtoken';

describe('Contest Integration Tests', () => {
  let app: any;
  let authToken: string;

  beforeAll(() => {
    app = createApp();

    // Create a test JWT token
    authToken = jwt.sign(
      {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/v1/contests', () => {
    const validContestData = {
      title: 'Test Contest',
      description: 'A test contest for integration testing',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // 26 hours from now
      registrationEnd: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(), // 23 hours from now
      maxParticipants: 100,
      problemIds: ['problem1', 'problem2'],
      rules: { maxSubmissions: 10 },
      scoringType: ScoringType.STANDARD,
      isPublic: true,
      prizePool: 1000,
    };

    it('should create contest with valid data and authentication', async () => {
      const response = await request(app)
        .post('/api/v1/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validContestData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(validContestData.title);
      expect(response.body.status).toBe(ContestStatus.UPCOMING);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/contests')
        .send(validContestData)
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        ...validContestData,
        title: '', // Invalid: empty title
        startTime: 'invalid-date', // Invalid: bad date format
      };

      const response = await request(app)
        .post('/api/v1/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when endTime is before startTime', async () => {
      const invalidData = {
        ...validContestData,
        startTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/v1/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/contests', () => {
    it('should return contests list without authentication', async () => {
      const response = await request(app).get('/api/v1/contests').expect(200);

      expect(response.body).toHaveProperty('contests');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.contests)).toBe(true);
    });

    it('should filter contests by status', async () => {
      const response = await request(app)
        .get('/api/v1/contests')
        .query({ status: ContestStatus.UPCOMING })
        .expect(200);

      expect(response.body.contests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: ContestStatus.UPCOMING }),
        ])
      );
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/contests')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.contests.length).toBeLessThanOrEqual(5);
    });

    it('should return 400 with invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/contests')
        .query({ page: 'invalid', limit: -1 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/contests/:id', () => {
    it('should return contest by valid ID', async () => {
      // First create a contest to get a valid ID
      const createResponse = await request(app)
        .post('/api/v1/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Contest for Get',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          problemIds: ['problem1'],
        });

      const contestId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/contests/${contestId}`)
        .expect(200);

      expect(response.body.id).toBe(contestId);
      expect(response.body.title).toBe('Test Contest for Get');
    });

    it('should return 404 for non-existent contest', async () => {
      const response = await request(app)
        .get('/api/v1/contests/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/contests/invalid-uuid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/contests/:id/register', () => {
    let contestId: string;

    beforeEach(async () => {
      // Create a contest for registration tests
      const createResponse = await request(app)
        .post('/api/v1/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Registration Test Contest',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          problemIds: ['problem1'],
          maxParticipants: 10,
        });

      contestId = createResponse.body.id;
    });

    it('should register user for contest', async () => {
      const response = await request(app)
        .post(`/api/v1/contests/${contestId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ teamName: 'Test Team' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.contestId).toBe(contestId);
      expect(response.body.userId).toBe('test-user-id');
      expect(response.body.teamName).toBe('Test Team');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/contests/${contestId}/register`)
        .send({})
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 404 for non-existent contest', async () => {
      const response = await request(app)
        .post('/api/v1/contests/123e4567-e89b-12d3-a456-426614174000/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/contests/:id/leaderboard', () => {
    let contestId: string;

    beforeEach(async () => {
      // Create a contest for leaderboard tests
      const createResponse = await request(app)
        .post('/api/v1/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Leaderboard Test Contest',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          problemIds: ['problem1'],
        });

      contestId = createResponse.body.id;
    });

    it('should return leaderboard for contest', async () => {
      const response = await request(app)
        .get(`/api/v1/contests/${contestId}/leaderboard`)
        .expect(200);

      expect(response.body).toHaveProperty('contestId');
      expect(response.body).toHaveProperty('rankings');
      expect(response.body).toHaveProperty('totalParticipants');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(Array.isArray(response.body.rankings)).toBe(true);
    });

    it('should limit leaderboard results', async () => {
      const response = await request(app)
        .get(`/api/v1/contests/${contestId}/leaderboard`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.rankings.length).toBeLessThanOrEqual(5);
    });

    it('should return 404 for non-existent contest', async () => {
      const response = await request(app)
        .get(
          '/api/v1/contests/123e4567-e89b-12d3-a456-426614174000/leaderboard'
        )
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('contest-service');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });
});
