import React from 'react';
import { Code, Trophy, Clock } from 'lucide-react';
import type { Activity } from '../types/types';
import { ActivityItem } from './ActivityItem';

interface RecentActivityProps {
  activities: Activity[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
}) => (
  <div className="card">
    <div className="card-header">
      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
    </div>
    <div className="card-content">
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No recent activity. Start solving problems!
          </p>
        ) : (
          activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  </div>
);
