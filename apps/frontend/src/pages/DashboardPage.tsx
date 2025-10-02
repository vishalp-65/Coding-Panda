import React from 'react';
import { useAppSelector } from '@/hooks/redux';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useDashboardData } from '@/hooks/useDashboardData';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { StatsGrid } from '@/components/StatsGrid';
import { RecentActivity } from '@/components/RecentActivity';
import { RecommendedProblems } from '@/components/RecommendedProblems';

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { stats, recentActivity, recommendedProblems, isLoading } =
    useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner username={user?.username} />
      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivity} />
        <RecommendedProblems problems={recommendedProblems} />
      </div>
    </div>
  );
};

export default DashboardPage;
