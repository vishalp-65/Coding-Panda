import { ContestRepository } from '../repositories/contest.repository';
import { NotificationService } from './notification.service';
import { CodeExecutionService } from './code-execution.service';
import { redis } from '../config/database';
import {
  Contest,
  ContestParticipant,
  ContestSubmission,
  ContestRanking,
  Leaderboard,
  LeaderboardEntry,
  CreateContestRequest,
  UpdateContestRequest,
  ContestRegistrationRequest,
  SubmitSolutionRequest,
  ContestSearchQuery,
  ContestListResponse,
  ContestStatus,
  ParticipantStatus,
  SubmissionStatus,
} from '../types/contest.types';
import { logger } from '../utils/logger';

export class ContestService {
  constructor(
    private contestRepository: ContestRepository,
    private notificationService: NotificationService,
    private codeExecutionService: CodeExecutionService
  ) {}

  async createContest(
    contestData: CreateContestRequest,
    createdBy: string
  ): Promise<Contest> {
    try {
      // Validate problem IDs exist (call to problem service would go here)
      await this.validateProblemIds(contestData.problemIds);

      const contest = await this.contestRepository.createContest(
        contestData,
        createdBy
      );

      // Cache the contest
      await this.cacheContest(contest);

      logger.info(`Contest created: ${contest.id} by user ${createdBy}`);
      return contest;
    } catch (error) {
      logger.error('Error creating contest:', error);
      throw error;
    }
  }

  async getContest(id: string): Promise<Contest | null> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedContest(id);
      if (cached) {
        return cached;
      }

      const contest = await this.contestRepository.getContestById(id);
      if (contest) {
        await this.cacheContest(contest);
      }

      return contest;
    } catch (error) {
      logger.error(`Error getting contest ${id}:`, error);
      throw error;
    }
  }

  async updateContest(
    id: string,
    updates: UpdateContestRequest,
    userId: string
  ): Promise<Contest | null> {
    try {
      const existingContest = await this.getContest(id);
      if (!existingContest) {
        return null;
      }

      // Check if user has permission to update (contest creator or admin)
      if (existingContest.createdBy !== userId) {
        throw new Error('Unauthorized to update this contest');
      }

      // Validate that contest can be updated (not active or ended)
      if (
        [ContestStatus.ACTIVE, ContestStatus.ENDED].includes(
          existingContest.status
        )
      ) {
        throw new Error('Cannot update active or ended contest');
      }

      if (updates.problemIds) {
        await this.validateProblemIds(updates.problemIds);
      }

      const updatedContest = await this.contestRepository.updateContest(
        id,
        updates
      );
      if (updatedContest) {
        await this.cacheContest(updatedContest);
        await this.invalidateContestCache(id);
      }

      return updatedContest;
    } catch (error) {
      logger.error(`Error updating contest ${id}:`, error);
      throw error;
    }
  }

  async deleteContest(id: string, userId: string): Promise<boolean> {
    try {
      const contest = await this.getContest(id);
      if (!contest) {
        return false;
      }

      // Check permissions
      if (contest.createdBy !== userId) {
        throw new Error('Unauthorized to delete this contest');
      }

      // Can only delete draft contests
      if (contest.status !== ContestStatus.DRAFT) {
        throw new Error('Can only delete draft contests');
      }

      const deleted = await this.contestRepository.deleteContest(id);
      if (deleted) {
        await this.invalidateContestCache(id);
      }

      return deleted;
    } catch (error) {
      logger.error(`Error deleting contest ${id}:`, error);
      throw error;
    }
  }

  async searchContests(
    searchQuery: ContestSearchQuery
  ): Promise<ContestListResponse> {
    try {
      const { contests, total } =
        await this.contestRepository.searchContests(searchQuery);
      const page = searchQuery.page || 1;
      const limit = searchQuery.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        contests,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error searching contests:', error);
      throw error;
    }
  }

  async registerForContest(
    contestId: string,
    userId: string,
    username: string,
    registrationData: ContestRegistrationRequest
  ): Promise<ContestParticipant> {
    try {
      const contest = await this.getContest(contestId);
      if (!contest) {
        throw new Error('Contest not found');
      }

      // Check if registration is open
      const now = new Date();
      if (contest.registrationEnd && now > contest.registrationEnd) {
        throw new Error('Registration period has ended');
      }

      if (contest.status === ContestStatus.ENDED) {
        throw new Error('Contest has ended');
      }

      // Check if already registered
      const existingParticipant = await this.contestRepository.getParticipant(
        contestId,
        userId
      );
      if (existingParticipant) {
        throw new Error('Already registered for this contest');
      }

      // Check participant limit
      if (contest.maxParticipants) {
        const participants =
          await this.contestRepository.getContestParticipants(contestId);
        if (participants.length >= contest.maxParticipants) {
          throw new Error('Contest is full');
        }
      }

      const participant = await this.contestRepository.registerParticipant(
        contestId,
        userId,
        username,
        registrationData.teamName
      );

      // Send notification
      await this.notificationService.sendContestRegistrationConfirmation(
        userId,
        contest
      );

      logger.info(`User ${userId} registered for contest ${contestId}`);
      return participant;
    } catch (error) {
      logger.error(`Error registering for contest ${contestId}:`, error);
      throw error;
    }
  }

  async submitSolution(
    contestId: string,
    userId: string,
    submissionData: SubmitSolutionRequest
  ): Promise<ContestSubmission> {
    try {
      const contest = await this.getContest(contestId);
      if (!contest) {
        throw new Error('Contest not found');
      }

      // Check if contest is active
      if (contest.status !== ContestStatus.ACTIVE) {
        throw new Error('Contest is not active');
      }

      // Check if user is registered
      const participant = await this.contestRepository.getParticipant(
        contestId,
        userId
      );
      if (!participant) {
        throw new Error('Not registered for this contest');
      }

      if (
        participant.status !== ParticipantStatus.PARTICIPATING &&
        participant.status !== ParticipantStatus.REGISTERED
      ) {
        throw new Error('Cannot submit - participant status is invalid');
      }

      // Check if problem is part of the contest
      if (!contest.problemIds.includes(submissionData.problemId)) {
        throw new Error('Problem is not part of this contest');
      }

      // Create pending submission
      const submission = await this.contestRepository.createSubmission({
        contestId,
        participantId: participant.id,
        problemId: submissionData.problemId,
        code: submissionData.code,
        language: submissionData.language,
        status: SubmissionStatus.PENDING,
        score: 0,
        testCasesPassed: 0,
        totalTestCases: 0,
      });

      // Execute code asynchronously
      this.executeSubmission(submission).catch(error => {
        logger.error(`Error executing submission ${submission.id}:`, error);
      });

      return submission;
    } catch (error) {
      logger.error(
        `Error submitting solution for contest ${contestId}:`,
        error
      );
      throw error;
    }
  }

  async getLeaderboard(
    contestId: string,
    limit?: number
  ): Promise<Leaderboard> {
    try {
      const contest = await this.getContest(contestId);
      if (!contest) {
        throw new Error('Contest not found');
      }

      // Try to get cached leaderboard first
      const cached = await this.getCachedLeaderboard(contestId);
      if (cached && contest.status !== ContestStatus.ACTIVE) {
        return cached;
      }

      const rankings = await this.contestRepository.getContestRankings(
        contestId,
        limit
      );
      const participants =
        await this.contestRepository.getContestParticipants(contestId);

      const leaderboardEntries: LeaderboardEntry[] = rankings.map(ranking => {
        const participant = participants.find(
          p => p.id === ranking.participantId
        );
        return {
          rank: ranking.rank,
          participant: {
            id: ranking.participantId,
            userId: participant?.userId || '',
            username: participant?.username || '',
            teamName: participant?.teamName,
          },
          totalScore: ranking.totalScore,
          problemsSolved: ranking.problemsSolved,
          totalPenalty: ranking.totalPenalty,
          lastSubmissionTime: ranking.lastSubmissionTime,
          problemScores: ranking.problemScores,
        };
      });

      const leaderboard: Leaderboard = {
        contestId,
        rankings: leaderboardEntries,
        totalParticipants: participants.length,
        lastUpdated: new Date(),
      };

      // Cache leaderboard for non-active contests
      if (contest.status !== ContestStatus.ACTIVE) {
        await this.cacheLeaderboard(leaderboard);
      }

      return leaderboard;
    } catch (error) {
      logger.error(
        `Error getting leaderboard for contest ${contestId}:`,
        error
      );
      throw error;
    }
  }

  async updateContestStatuses(): Promise<void> {
    try {
      await this.contestRepository.updateContestStatus();
      logger.info('Contest statuses updated');
    } catch (error) {
      logger.error('Error updating contest statuses:', error);
      throw error;
    }
  }

  private async executeSubmission(
    submission: ContestSubmission
  ): Promise<void> {
    try {
      // Execute the code
      const result = await this.codeExecutionService.executeCode({
        code: submission.code,
        language: submission.language,
        problemId: submission.problemId,
      });

      // Update submission with results
      await this.contestRepository.updateSubmissionResult(
        submission.id,
        result.status,
        result.score,
        result.executionTime,
        result.memoryUsed,
        result.testCasesPassed,
        result.totalTestCases
      );

      // Recalculate rankings if submission was accepted
      if (result.status === SubmissionStatus.ACCEPTED) {
        await this.contestRepository.calculateRankings(submission.contestId);
        await this.invalidateLeaderboardCache(submission.contestId);
      }

      logger.info(
        `Submission ${submission.id} executed with status: ${result.status}`
      );
    } catch (error) {
      logger.error(`Error executing submission ${submission.id}:`, error);

      // Mark submission as error
      await this.contestRepository.updateSubmissionResult(
        submission.id,
        SubmissionStatus.RUNTIME_ERROR,
        0
      );
    }
  }

  private async validateProblemIds(problemIds: string[]): Promise<void> {
    // This would make a call to the problem service to validate problem IDs
    // For now, we'll just log it
    logger.info(`Validating problem IDs: ${problemIds.join(', ')}`);
  }

  private async cacheContest(contest: Contest): Promise<void> {
    try {
      await redis.setEx(`contest:${contest.id}`, 1800, JSON.stringify(contest)); // 30 minutes
    } catch (error) {
      logger.error('Error caching contest:', error);
    }
  }

  private async getCachedContest(id: string): Promise<Contest | null> {
    try {
      const cached = await redis.get(`contest:${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached contest:', error);
      return null;
    }
  }

  private async invalidateContestCache(id: string): Promise<void> {
    try {
      await redis.del(`contest:${id}`);
    } catch (error) {
      logger.error('Error invalidating contest cache:', error);
    }
  }

  private async cacheLeaderboard(leaderboard: Leaderboard): Promise<void> {
    try {
      await redis.setEx(
        `leaderboard:${leaderboard.contestId}`,
        300, // 5 minutes
        JSON.stringify(leaderboard)
      );
    } catch (error) {
      logger.error('Error caching leaderboard:', error);
    }
  }

  private async getCachedLeaderboard(
    contestId: string
  ): Promise<Leaderboard | null> {
    try {
      const cached = await redis.get(`leaderboard:${contestId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached leaderboard:', error);
      return null;
    }
  }

  private async invalidateLeaderboardCache(contestId: string): Promise<void> {
    try {
      await redis.del(`leaderboard:${contestId}`);
    } catch (error) {
      logger.error('Error invalidating leaderboard cache:', error);
    }
  }
}
