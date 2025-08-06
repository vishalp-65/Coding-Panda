import { Server } from 'socket.io';
import { RedisManager } from '../config/redis';
import { LeaderboardUpdate, ContestRanking } from '../types';

export class LeaderboardService {
  private io: Server;
  private redis: RedisManager;

  constructor(io: Server) {
    this.io = io;
    this.redis = RedisManager.getInstance();
  }

  async updateContestLeaderboard(
    contestId: string, 
    rankings: ContestRanking[]
  ): Promise<void> {
    try {
      // Store updated leaderboard in Redis
      await this.redis.updateLeaderboard(contestId, rankings);

      // Create leaderboard update object
      const update: LeaderboardUpdate = {
        contestId,
        rankings,
        lastUpdated: new Date()
      };

      // Broadcast to contest room
      this.io.to(`contest:${contestId}`).emit('leaderboard-update', update);

      console.log(`Leaderboard updated for contest ${contestId} with ${rankings.length} participants`);
    } catch (error) {
      console.error('Error updating contest leaderboard:', error);
    }
  }

  async getContestLeaderboard(contestId: string, limit = 100): Promise<ContestRanking[]> {
    try {
      return await this.redis.getLeaderboard(contestId, limit);
    } catch (error) {
      console.error('Error getting contest leaderboard:', error);
      return [];
    }
  }

  async updateUserRanking(
    contestId: string, 
    userId: string, 
    username: string,
    score: number, 
    solvedProblems: number, 
    penalty: number
  ): Promise<void> {
    try {
      // Get current leaderboard
      const currentRankings = await this.getContestLeaderboard(contestId);
      
      // Find and update user's ranking or add new one
      let userRanking = currentRankings.find(r => r.userId === userId);
      
      if (userRanking) {
        userRanking.score = score;
        userRanking.solvedProblems = solvedProblems;
        userRanking.penalty = penalty;
        userRanking.lastSubmissionTime = new Date();
      } else {
        userRanking = {
          userId,
          username,
          score,
          rank: 0, // Will be calculated when sorting
          solvedProblems,
          penalty,
          lastSubmissionTime: new Date()
        };
        currentRankings.push(userRanking);
      }

      // Sort and assign ranks
      const sortedRankings = this.sortRankings(currentRankings);
      
      // Update the full leaderboard
      await this.updateContestLeaderboard(contestId, sortedRankings);

      // Send individual ranking update to the user
      this.io.to(`user:${userId}`).emit('ranking-updated', {
        contestId,
        ranking: userRanking,
        previousRank: userRanking.rank
      });

    } catch (error) {
      console.error('Error updating user ranking:', error);
    }
  }

  async addSubmissionToLeaderboard(
    contestId: string,
    userId: string,
    username: string,
    problemId: string,
    isAccepted: boolean,
    submissionTime: Date,
    penalty = 0
  ): Promise<void> {
    try {
      const rankings = await this.getContestLeaderboard(contestId);
      let userRanking = rankings.find(r => r.userId === userId);

      if (!userRanking) {
        userRanking = {
          userId,
          username,
          score: 0,
          rank: 0,
          solvedProblems: 0,
          penalty: 0,
          lastSubmissionTime: submissionTime
        };
        rankings.push(userRanking);
      }

      // Update ranking based on submission
      if (isAccepted) {
        userRanking.solvedProblems += 1;
        userRanking.score += this.calculateProblemScore(problemId, submissionTime);
      }
      
      userRanking.penalty += penalty;
      userRanking.lastSubmissionTime = submissionTime;

      // Sort and update leaderboard
      const sortedRankings = this.sortRankings(rankings);
      await this.updateContestLeaderboard(contestId, sortedRankings);

    } catch (error) {
      console.error('Error adding submission to leaderboard:', error);
    }
  }

  async freezeLeaderboard(contestId: string): Promise<void> {
    try {
      const key = `leaderboard:${contestId}:frozen`;
      await this.redis.getDataClient().set(key, 'true');
      
      // Notify all contest participants
      this.io.to(`contest:${contestId}`).emit('leaderboard-frozen', {
        contestId,
        timestamp: new Date()
      });

      console.log(`Leaderboard frozen for contest ${contestId}`);
    } catch (error) {
      console.error('Error freezing leaderboard:', error);
    }
  }

  async unfreezeLeaderboard(contestId: string): Promise<void> {
    try {
      const key = `leaderboard:${contestId}:frozen`;
      await this.redis.getDataClient().del(key);
      
      // Get final rankings and broadcast
      const finalRankings = await this.getContestLeaderboard(contestId);
      
      this.io.to(`contest:${contestId}`).emit('leaderboard-unfrozen', {
        contestId,
        finalRankings,
        timestamp: new Date()
      });

      console.log(`Leaderboard unfrozen for contest ${contestId}`);
    } catch (error) {
      console.error('Error unfreezing leaderboard:', error);
    }
  }

  async isLeaderboardFrozen(contestId: string): Promise<boolean> {
    try {
      const key = `leaderboard:${contestId}:frozen`;
      const result = await this.redis.getDataClient().get(key);
      return result === 'true';
    } catch (error) {
      console.error('Error checking if leaderboard is frozen:', error);
      return false;
    }
  }

  async getUserRank(contestId: string, userId: string): Promise<ContestRanking | null> {
    try {
      const rankings = await this.getContestLeaderboard(contestId);
      return rankings.find(r => r.userId === userId) || null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  async getTopPerformers(contestId: string, limit = 10): Promise<ContestRanking[]> {
    try {
      const rankings = await this.getContestLeaderboard(contestId, limit);
      return rankings.slice(0, limit);
    } catch (error) {
      console.error('Error getting top performers:', error);
      return [];
    }
  }

  // Real-time leaderboard streaming for live updates
  async startLeaderboardStream(contestId: string, intervalMs = 5000): Promise<void> {
    const streamKey = `stream:${contestId}`;
    
    // Check if stream is already running
    const isRunning = await this.redis.getDataClient().get(streamKey);
    if (isRunning) {
      return;
    }

    // Mark stream as running
    await this.redis.getDataClient().setEx(streamKey, 3600, 'running'); // 1 hour TTL

    const interval = setInterval(async () => {
      try {
        // Check if contest is still active
        const stillRunning = await this.redis.getDataClient().get(streamKey);
        if (!stillRunning) {
          clearInterval(interval);
          return;
        }

        // Get current leaderboard and broadcast
        const rankings = await this.getContestLeaderboard(contestId, 50);
        
        this.io.to(`contest:${contestId}`).emit('leaderboard-stream', {
          contestId,
          rankings,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error in leaderboard stream:', error);
      }
    }, intervalMs);

    console.log(`Started leaderboard stream for contest ${contestId}`);
  }

  async stopLeaderboardStream(contestId: string): Promise<void> {
    const streamKey = `stream:${contestId}`;
    await this.redis.getDataClient().del(streamKey);
    console.log(`Stopped leaderboard stream for contest ${contestId}`);
  }

  // Helper methods
  private sortRankings(rankings: ContestRanking[]): ContestRanking[] {
    // Sort by: 1) Problems solved (desc), 2) Total penalty (asc), 3) Last submission time (asc)
    const sorted = rankings.sort((a, b) => {
      if (a.solvedProblems !== b.solvedProblems) {
        return b.solvedProblems - a.solvedProblems;
      }
      if (a.penalty !== b.penalty) {
        return a.penalty - b.penalty;
      }
      return a.lastSubmissionTime.getTime() - b.lastSubmissionTime.getTime();
    });

    // Assign ranks
    sorted.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return sorted;
  }

  private calculateProblemScore(problemId: string, submissionTime: Date): number {
    // Simple scoring: base score minus time penalty
    // In a real system, this would be more sophisticated
    const baseScore = 100;
    const timePenalty = Math.floor(submissionTime.getTime() / (1000 * 60)); // Minutes
    return Math.max(baseScore - timePenalty, 10); // Minimum 10 points
  }

  // Analytics methods
  async getLeaderboardStats(contestId: string): Promise<any> {
    try {
      const rankings = await this.getContestLeaderboard(contestId);
      
      return {
        totalParticipants: rankings.length,
        averageScore: rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length,
        averageSolved: rankings.reduce((sum, r) => sum + r.solvedProblems, 0) / rankings.length,
        topScore: rankings.length > 0 ? rankings[0].score : 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting leaderboard stats:', error);
      return null;
    }
  }

  async exportLeaderboard(contestId: string): Promise<ContestRanking[]> {
    return await this.getContestLeaderboard(contestId, 1000); // Get all participants
  }
}