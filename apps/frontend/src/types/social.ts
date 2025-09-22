export interface UserProfile {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    company?: string;
    position?: string;
    experience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    skills: string[];
    interests: string[];
    stats: UserStats;
    preferences: UserPreferences;
    isFollowing?: boolean;
    isFollowedBy?: boolean;
    createdAt: string;
    lastActive: string;
}

export interface UserStats {
    problemsSolved: number;
    totalSubmissions: number;
    acceptanceRate: number;
    contestsParticipated: number;
    bestRank: number;
    currentStreak: number;
    longestStreak: number;
    skillRatings: Record<string, number>;
    badges: Badge[];
    achievements: Achievement[];
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: NotificationSettings;
    privacy: PrivacySettings;
    editor: EditorSettings;
}

export interface NotificationSettings {
    email: boolean;
    push: boolean;
    contests: boolean;
    followers: boolean;
    mentions: boolean;
    achievements: boolean;
    weeklyDigest: boolean;
}

export interface PrivacySettings {
    profileVisibility: 'public' | 'friends' | 'private';
    showStats: boolean;
    showActivity: boolean;
    allowMessages: boolean;
    allowFollows: boolean;
}

export interface EditorSettings {
    theme: string;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    showLineNumbers: boolean;
    autoComplete: boolean;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedAt: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'problem_solving' | 'contest' | 'social' | 'learning' | 'special';
    progress: number;
    maxProgress: number;
    isCompleted: boolean;
    completedAt?: string;
    reward?: {
        type: 'badge' | 'points' | 'title';
        value: string;
    };
}

export interface Follow {
    id: string;
    followerId: string;
    followingId: string;
    createdAt: string;
}

export interface ActivityFeed {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    type: 'problem_solved' | 'contest_joined' | 'contest_won' | 'badge_earned' | 'achievement_unlocked' | 'follow' | 'post_created';
    content: ActivityContent;
    timestamp: string;
    isPublic: boolean;
    likes: number;
    comments: number;
    userLiked?: boolean;
}

export interface ActivityContent {
    title: string;
    description?: string;
    metadata?: {
        problemId?: string;
        problemTitle?: string;
        contestId?: string;
        contestTitle?: string;
        badgeId?: string;
        achievementId?: string;
        followedUserId?: string;
        followedUsername?: string;
        difficulty?: string;
        language?: string;
        executionTime?: number;
        rank?: number;
    };
}

export interface SocialPost {
    id: string;
    author: {
        id: string;
        username: string;
        avatar?: string;
    };
    content: string;
    type: 'text' | 'code' | 'image' | 'link';
    attachments?: PostAttachment[];
    tags: string[];
    likes: number;
    comments: number;
    shares: number;
    userLiked?: boolean;
    userBookmarked?: boolean;
    visibility: 'public' | 'followers' | 'private';
    createdAt: string;
    updatedAt: string;
}

export interface PostAttachment {
    id: string;
    type: 'image' | 'code' | 'link' | 'file';
    url: string;
    metadata?: {
        language?: string;
        title?: string;
        description?: string;
        thumbnail?: string;
        size?: number;
    };
}

export interface Comment {
    id: string;
    postId: string;
    author: {
        id: string;
        username: string;
        avatar?: string;
    };
    content: string;
    parentId?: string; // for nested comments
    likes: number;
    userLiked?: boolean;
    createdAt: string;
    updatedAt: string;
    replies?: Comment[];
}

export interface Notification {
    id: string;
    userId: string;
    type: 'follow' | 'like' | 'comment' | 'mention' | 'contest' | 'achievement' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    actionUrl?: string;
    metadata?: {
        fromUserId?: string;
        fromUsername?: string;
        postId?: string;
        contestId?: string;
        achievementId?: string;
    };
    createdAt: string;
}