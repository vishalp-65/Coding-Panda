import React from 'react';
import { CheckCircle, Trophy, TrendingUp, Target, Award, BarChart3 } from 'lucide-react';
import type { DashboardStats } from '../types/types';
import { StatCard } from './StatCard';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const statCards = [
    {
      label: 'Problems Solved',
      value: stats.problemsSolved,
      icon: CheckCircle,
      bgColor: 'bg-success-100',
      iconColor: 'text-success-600',
    },
    {
      label: 'Acceptance Rate',
      value: `${stats.acceptanceRate}%`,
      subtitle: `${stats.acceptedSubmissions}/${stats.totalSubmissions}`,
      icon: BarChart3,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Current Streak',
      value: `${stats.streak} days`,
      subtitle: `Best: ${stats.longestStreak}`,
      icon: TrendingUp,
      bgColor: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      label: 'Contests',
      value: stats.contestsParticipated,
      subtitle: stats.ranking > 0 ? `Rank: ${stats.ranking}` : undefined,
      icon: Trophy,
      bgColor: 'bg-warning-100',
      iconColor: 'text-warning-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};
