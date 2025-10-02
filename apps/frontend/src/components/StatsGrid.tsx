import React from 'react';
import { CheckCircle, Trophy, TrendingUp, Target } from 'lucide-react';
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
      subtitle: `/${stats.totalProblems}`,
      icon: CheckCircle,
      bgColor: 'bg-success-100',
      iconColor: 'text-success-600',
    },
    {
      label: 'Contests',
      value: stats.contestsParticipated,
      icon: Trophy,
      bgColor: 'bg-warning-100',
      iconColor: 'text-warning-600',
    },
    {
      label: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: TrendingUp,
      bgColor: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      label: 'Weekly Goal',
      value: `${stats.weeklyProgress}/${stats.weeklyGoal}`,
      icon: Target,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
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
