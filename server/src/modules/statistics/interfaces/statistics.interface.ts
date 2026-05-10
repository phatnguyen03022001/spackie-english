// src/modules/statistics/interfaces/statistics.interface.ts

export interface IDashboardStats {
  totalCardsLearned: number;
  totalReviews: number;
  totalListeningPractices: number;
  currentStreak: number;
  longestStreak: number;
  averageAccuracy: number;
  totalStudyTime: number;
  dailyActivity: IDailyActivity[];
}

export interface IDailyActivity {
  date: string;
  reviews: number;
  listeningPractices: number;
  studyTime: number;
}

export interface IAdminOverview {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  recentSignups: number;
}
