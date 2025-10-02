export interface DashboardStats {
  problemsSolved: number;
  totalProblems: number;
  contestsParticipated: number;
  currentStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
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
