export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'problem_solving' | 'contest' | 'streak' | 'social' | 'learning';
  criteria: AchievementCriteria;
  reward?: AchievementReward;
}

export interface AchievementCriteria {
  type: 'count' | 'streak' | 'percentage' | 'time_based';
  target: number;
  metric: string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface AchievementReward {
  type: 'badge' | 'points' | 'premium_days' | 'feature_unlock';
  value: string | number;
  description: string;
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  unlockedAt: Date;
  progress: number; // 0-100
  isVisible: boolean;
}

export interface ActivityFeed {
  id: string;
  userId: string;
  type:
    | 'problem_solved'
    | 'contest_participated'
    | 'achievement_unlocked'
    | 'streak_milestone';
  title: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
  isPublic: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: ServiceHealth[];
  lastChecked: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  lastError?: string;
}
