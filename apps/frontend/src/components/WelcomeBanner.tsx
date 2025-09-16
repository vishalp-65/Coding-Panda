import React from 'react';

interface WelcomeBannerProps {
  username?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ username }) => (
  <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
    <h1 className="text-2xl font-bold mb-2">Welcome back, {username}! 👋</h1>
    <p className="text-primary-100">
      Ready to continue your coding journey? Let's solve some problems!
    </p>
  </div>
);
