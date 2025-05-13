export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  profile: UserProfile;
  preferences: UserPreferences;
  roles: UserRole[];
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  linkedinProfile?: string;
  company?: string;
  jobTitle?: string;
  skillLevel: SkillLevel;
  programmingLanguages: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: EmailNotificationSettings;
  privacySettings: PrivacySettings;
}

export interface EmailNotificationSettings {
  contestReminders: boolean;
  newProblems: boolean;
  achievementUnlocked: boolean;
  weeklyDigest: boolean;
  socialActivity: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showRealName: boolean;
  showLocation: boolean;
  allowDirectMessages: boolean;
}

export type UserRole = 'admin' | 'moderator' | 'user' | 'premium_user';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface UserStats {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  problemsSolved: number;
  contestsParticipated: number;
  ranking: number;
  streak: number;
  longestStreak: number;
  skillRatings: Record<string, number>;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}