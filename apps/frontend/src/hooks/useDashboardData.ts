import { useState, useEffect } from 'react';
import { dashboardApi, problemsApi } from '@/services/api';
import type { DashboardStats, Activity, Problem } from '../types/types';

interface UseDashboardDataReturn {
  stats: DashboardStats;
  recentActivity: Activity[];
  recommendedProblems: Problem[];
  isLoading: boolean;
  error: Error | null;
}

// Fallback mock data
const mockData = {
  stats: {
    problemsSolved: 42,
    totalProblems: 150,
    contestsParticipated: 8,
    currentStreak: 5,
    weeklyGoal: 10,
    weeklyProgress: 7,
    totalSubmissions: 300,
    acceptedSubmissions: 120,
    acceptanceRate: '40',
    ranking: 512,
    accuracy: 85,
    xp: 1200,
    streak: 100,
    longestStreak: 100,
    skillRatings: {
      'Data Structures': 100,
      Algorithms: 100,
      'System Design': 100,
    },
  },
  recentActivity: [
    {
      id: 1,
      type: 'problem' as const,
      title: 'Two Sum',
      status: 'solved',
      difficulty: 'easy' as const,
      timestamp: '2 hours ago',
    },
    {
      id: 2,
      type: 'contest' as const,
      title: 'Weekly Contest 123',
      status: 'participated',
      rank: 45,
      timestamp: '1 day ago',
    },
    {
      id: 3,
      type: 'problem' as const,
      title: 'Binary Tree Inorder Traversal',
      status: 'attempted',
      difficulty: 'medium' as const,
      timestamp: '2 days ago',
    },
  ],
  recommendedProblems: [
    {
      id: 1,
      title: 'Valid Parentheses',
      difficulty: 'easy' as const,
      tags: ['Stack', 'String'],
      acceptanceRate: 40.1,
    },
    {
      id: 2,
      title: 'Merge Two Sorted Lists',
      difficulty: 'easy' as const,
      tags: ['Linked List', 'Recursion'],
      acceptanceRate: 62.4,
    },
    {
      id: 3,
      title: 'Maximum Subarray',
      difficulty: 'medium' as const,
      tags: ['Array', 'Dynamic Programming'],
      acceptanceRate: 49.5,
    },
  ],
};

export const useDashboardData = (): UseDashboardDataReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState(mockData);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch data from APIs
        const [statsResponse, activityResponse, problemsResponse] =
          await Promise.allSettled([
            dashboardApi.getDashboardStats(),
            dashboardApi.getRecentActivity(),
            problemsApi.getRecommendedProblems(),
          ]);

        console.log('Response is ', {
          statsResponse,
          activityResponse,
          problemsResponse,
        });

        const newData = { ...mockData };

        // Update with real data if available
        if (statsResponse.status === 'fulfilled') {
          newData.stats = statsResponse.value;
        }

        if (activityResponse.status === 'fulfilled') {
          newData.recentActivity = activityResponse.value;
        }

        if (problemsResponse.status === 'fulfilled') {
          newData.recommendedProblems = problemsResponse.value;
        }

        setData(newData);
      } catch (err) {
        console.warn('Failed to fetch dashboard data, using mock data:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch dashboard data')
        );
        // Keep using mock data on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return {
    ...data,
    isLoading,
    error,
  };
};
