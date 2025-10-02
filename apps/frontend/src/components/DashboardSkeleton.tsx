import React from 'react';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 bg-gray-200 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-lg" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-96 bg-gray-200 rounded-lg" />
      <div className="h-96 bg-gray-200 rounded-lg" />
    </div>
  </div>
);
