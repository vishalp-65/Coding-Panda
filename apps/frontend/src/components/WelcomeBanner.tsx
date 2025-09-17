import React from 'react';
import { useAppSelector } from '@/hooks/redux';

interface WelcomeBannerProps {
  username?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ username }) => {
  const { user } = useAppSelector(state => state.auth);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.profile?.firstName
    ? ` ${user.profile.firstName}`
    : username;

  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">
        {getGreeting()}, {displayName}! 👋
      </h1>
      <p className="text-primary-100">
        {user?.stats?.problemsSolved === 0
          ? "Ready to start your coding journey? Let's solve your first problem!"
          : "Ready to continue your coding journey? Let's solve some problems!"}
      </p>
      {user?.profile?.skillLevel && (
        <div className="mt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-400 text-white">
            {user.profile.skillLevel.charAt(0).toUpperCase() +
              user.profile.skillLevel.slice(1)}{' '}
            Level
          </span>
        </div>
      )}
    </div>
  );
};
