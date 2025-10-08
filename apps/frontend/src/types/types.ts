export interface DashboardStats {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: string;
  problemsSolved: number;
  contestsParticipated: number;
  ranking: number;
  streak: number;
  longestStreak: number;
  skillRatings: Record<string, number>;
}

export interface Activity {
  id: number;
  type: 'problem' | 'contest';
  title: string;
  status: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  rank?: number;
  timestamp: string;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  acceptanceRate: number;
}
