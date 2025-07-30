import { Pool, PoolClient } from 'pg';
import {
  Contest,
  ContestParticipant,
  ContestSubmission,
  ContestRanking,
  ContestAnalytics,
  CreateContestRequest,
  UpdateContestRequest,
  ContestSearchQuery,
  ContestStatus,
  ParticipantStatus,
  SubmissionStatus,
} from '../types/contest.types';
import { logger } from '../utils/logger';

export class ContestRepository {
  constructor(private db: Pool) {}

  async createContest(
    contestData: CreateContestRequest,
    createdBy: string
  ): Promise<Contest> {
    const client = await this.db.connect();
    try {
      const query = `
        INSERT INTO contests (
          title, description, start_time, end_time, registration_end,
          max_participants, problem_ids, rules, scoring_type, is_public,
          created_by, prize_pool
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        contestData.title,
        contestData.description,
        contestData.startTime,
        contestData.endTime,
        contestData.registrationEnd,
        contestData.maxParticipants,
        contestData.problemIds,
        JSON.stringify(contestData.rules || {}),
        contestData.scoringType || 'standard',
        contestData.isPublic !== false,
        createdBy,
        contestData.prizePool || 0,
      ];

      const result = await client.query(query, values);
      return this.mapRowToContest(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getContestById(id: string): Promise<Contest | null> {
    const client = await this.db.connect();
    try {
      const query = 'SELECT * FROM contests WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToContest(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateContest(
    id: string,
    updates: UpdateContestRequest
  ): Promise<Contest | null> {
    const client = await this.db.connect();
    try {
      const setClause: string[] = [];
      const values: (string | number)[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbColumn = this.camelToSnake(key);
          if (key === 'rules') {
            setClause.push(`${dbColumn} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setClause.push(`${dbColumn} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return this.getContestById(id);
      }

      const query = `
        UPDATE contests 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToContest(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteContest(id: string): Promise<boolean> {
    const client = await this.db.connect();
    try {
      const query = 'DELETE FROM contests WHERE id = $1';
      const result = await client.query(query, [id]);
      return result!.rowCount! > 0;
    } finally {
      client.release();
    }
  }

  async searchContests(
    searchQuery: ContestSearchQuery
  ): Promise<{ contests: Contest[]; total: number }> {
    const client = await this.db.connect();
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (searchQuery.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(searchQuery.status);
        paramIndex++;
      }

      if (searchQuery.isPublic !== undefined) {
        conditions.push(`is_public = $${paramIndex}`);
        values.push(searchQuery.isPublic);
        paramIndex++;
      }

      if (searchQuery.createdBy) {
        conditions.push(`created_by = $${paramIndex}`);
        values.push(searchQuery.createdBy);
        paramIndex++;
      }

      if (searchQuery.startDate) {
        conditions.push(`start_time >= $${paramIndex}`);
        values.push(searchQuery.startDate);
        paramIndex++;
      }

      if (searchQuery.endDate) {
        conditions.push(`end_time <= $${paramIndex}`);
        values.push(searchQuery.endDate);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderBy = `ORDER BY ${this.camelToSnake(searchQuery.sortBy || 'startTime')} ${searchQuery.sortOrder || 'desc'}`;
      const limit = searchQuery.limit || 20;
      const offset = ((searchQuery.page || 1) - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM contests ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get contests
      const contestsQuery = `
        SELECT * FROM contests 
        ${whereClause} 
        ${orderBy} 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);

      const contestsResult = await client.query(contestsQuery, values);
      const contests = contestsResult.rows.map(row =>
        this.mapRowToContest(row)
      );

      return { contests, total };
    } finally {
      client.release();
    }
  }

  async registerParticipant(
    contestId: string,
    userId: string,
    username: string,
    teamName?: string
  ): Promise<ContestParticipant> {
    const client = await this.db.connect();
    try {
      const query = `
        INSERT INTO contest_participants (contest_id, user_id, username, team_name)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await client.query(query, [
        contestId,
        userId,
        username,
        teamName,
      ]);
      return this.mapRowToParticipant(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getParticipant(
    contestId: string,
    userId: string
  ): Promise<ContestParticipant | null> {
    const client = await this.db.connect();
    try {
      const query =
        'SELECT * FROM contest_participants WHERE contest_id = $1 AND user_id = $2';
      const result = await client.query(query, [contestId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToParticipant(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getContestParticipants(
    contestId: string
  ): Promise<ContestParticipant[]> {
    const client = await this.db.connect();
    try {
      const query =
        'SELECT * FROM contest_participants WHERE contest_id = $1 ORDER BY registered_at';
      const result = await client.query(query, [contestId]);
      return result.rows.map(row => this.mapRowToParticipant(row));
    } finally {
      client.release();
    }
  }

  async createSubmission(
    submission: Omit<ContestSubmission, 'id' | 'submittedAt'>
  ): Promise<ContestSubmission> {
    const client = await this.db.connect();
    try {
      const query = `
        INSERT INTO contest_submissions (
          contest_id, participant_id, problem_id, code, language, status,
          score, execution_time, memory_used, test_cases_passed, total_test_cases
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        submission.contestId,
        submission.participantId,
        submission.problemId,
        submission.code,
        submission.language,
        submission.status,
        submission.score,
        submission.executionTime,
        submission.memoryUsed,
        submission.testCasesPassed,
        submission.totalTestCases,
      ];

      const result = await client.query(query, values);
      return this.mapRowToSubmission(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateSubmissionResult(
    submissionId: string,
    status: SubmissionStatus,
    score: number,
    executionTime?: number,
    memoryUsed?: number,
    testCasesPassed?: number,
    totalTestCases?: number
  ): Promise<ContestSubmission | null> {
    const client = await this.db.connect();
    try {
      const query = `
        UPDATE contest_submissions 
        SET status = $1, score = $2, execution_time = $3, memory_used = $4,
            test_cases_passed = $5, total_test_cases = $6, judged_at = NOW()
        WHERE id = $7
        RETURNING *
      `;

      const result = await client.query(query, [
        status,
        score,
        executionTime,
        memoryUsed,
        testCasesPassed,
        totalTestCases,
        submissionId,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSubmission(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getContestSubmissions(
    contestId: string,
    participantId?: string
  ): Promise<ContestSubmission[]> {
    const client = await this.db.connect();
    try {
      let query = 'SELECT * FROM contest_submissions WHERE contest_id = $1';
      const values = [contestId];

      if (participantId) {
        query += ' AND participant_id = $2';
        values.push(participantId);
      }

      query += ' ORDER BY submitted_at DESC';

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToSubmission(row));
    } finally {
      client.release();
    }
  }

  async calculateRankings(contestId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('SELECT calculate_contest_rankings($1)', [contestId]);
    } finally {
      client.release();
    }
  }

  async getContestRankings(
    contestId: string,
    limit?: number
  ): Promise<ContestRanking[]> {
    const client = await this.db.connect();
    try {
      let query = `
        SELECT cr.*, cp.username, cp.team_name
        FROM contest_rankings cr
        JOIN contest_participants cp ON cr.participant_id = cp.id
        WHERE cr.contest_id = $1
        ORDER BY cr.rank
      `;

      const values = [contestId];

      if (limit) {
        query += ` LIMIT $2`;
        values.push(String(limit));
      }

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToRanking(row));
    } finally {
      client.release();
    }
  }

  async updateContestStatus(): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('SELECT update_contest_status()');
    } finally {
      client.release();
    }
  }

  private mapRowToContest(row: any): Contest {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      registrationStart: row.registration_start,
      registrationEnd: row.registration_end,
      maxParticipants: row.max_participants,
      problemIds: row.problem_ids,
      rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules,
      scoringType: row.scoring_type,
      status: row.status,
      isPublic: row.is_public,
      createdBy: row.created_by,
      prizePool: parseFloat(row.prize_pool),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToParticipant(row: any): ContestParticipant {
    return {
      id: row.id,
      contestId: row.contest_id,
      userId: row.user_id,
      username: row.username,
      registeredAt: row.registered_at,
      status: row.status,
      teamName: row.team_name,
    };
  }

  private mapRowToSubmission(row: any): ContestSubmission {
    return {
      id: row.id,
      contestId: row.contest_id,
      participantId: row.participant_id,
      problemId: row.problem_id,
      code: row.code,
      language: row.language,
      status: row.status,
      score: row.score,
      executionTime: row.execution_time,
      memoryUsed: row.memory_used,
      testCasesPassed: row.test_cases_passed,
      totalTestCases: row.total_test_cases,
      submittedAt: row.submitted_at,
      judgedAt: row.judged_at,
    };
  }

  private mapRowToRanking(row: any): ContestRanking {
    return {
      id: row.id,
      contestId: row.contest_id,
      participantId: row.participant_id,
      rank: row.rank,
      totalScore: row.total_score,
      problemsSolved: row.problems_solved,
      totalPenalty: row.total_penalty,
      lastSubmissionTime: row.last_submission_time,
      problemScores:
        typeof row.problem_scores === 'string'
          ? JSON.parse(row.problem_scores)
          : row.problem_scores,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
