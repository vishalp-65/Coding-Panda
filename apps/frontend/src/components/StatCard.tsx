import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  bgColor,
  iconColor,
}) => (
  <div className="card h-24 flex items-center">
    <div className="card-content w-full h-full flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Left Side (Text) */}
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {subtitle && (
              <span className="ml-1 text-sm font-normal text-gray-500">
                {subtitle}
              </span>
            )}
          </p>
        </div>

        {/* Right Side (Icon) */}
        <div
          className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  </div>
);
