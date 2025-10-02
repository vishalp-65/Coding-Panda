import React from 'react';
import { Code, Trophy, Clock } from 'lucide-react';
import type { Activity } from '../types/types';

interface ActivityItemProps {
  activity: Activity;
}

const difficultyColors = {
  easy: 'text-green-600',
  medium: 'text-yellow-600',
  hard: 'text-red-600',
};

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const Icon = activity.type === 'problem' ? Code : Trophy;
  const iconBgColor =
    activity.type === 'problem' ? 'bg-blue-100' : 'bg-yellow-100';
  const iconColor =
    activity.type === 'problem' ? 'text-blue-600' : 'text-yellow-600';

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <div
          className={`w-8 h-8 ${iconBgColor} rounded-full flex items-center justify-center`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{activity.status}</span>
          {activity.difficulty && (
            <>
              <span>•</span>
              <span
                className={`capitalize ${difficultyColors[activity.difficulty]}`}
              >
                {activity.difficulty}
              </span>
            </>
          )}
          {activity.rank && (
            <>
              <span>•</span>
              <span>Rank #{activity.rank}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center text-xs text-gray-500">
        <Clock className="h-3 w-3 mr-1" />
        {activity.timestamp}
      </div>
    </div>
  );
};
