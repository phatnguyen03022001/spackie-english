// src/modules/statistics/dto/dashboard-stats.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DailyActivityDto {
  @ApiProperty({ example: '2026-05-10' })
  date!: string;

  @ApiProperty({ example: 5 })
  reviews!: number;

  @ApiProperty({ example: 2 })
  listeningPractices!: number;

  @ApiProperty({ example: 600 })
  studyTime!: number;
}

export class DashboardStatsDto {
  @ApiProperty({ example: 42 })
  totalCardsLearned!: number;

  @ApiProperty({ example: 156 })
  totalReviews!: number;

  @ApiProperty({ example: 15 })
  totalMastered!: number;

  @ApiProperty({ example: 23 })
  totalListeningPractices!: number;

  @ApiProperty({ example: 3 })
  currentStreak!: number;

  @ApiProperty({ example: 12 })
  longestStreak!: number;

  @ApiProperty({ example: 85 })
  averageAccuracy!: number;

  @ApiProperty({ example: 3600 })
  totalStudyTime!: number;

  @ApiProperty({ type: [DailyActivityDto] })
  dailyActivity!: DailyActivityDto[];
}

export class AdminOverviewDto {
  @ApiProperty({ example: 100 })
  totalUsers!: number;

  @ApiProperty({ example: 45 })
  activeSubscriptions!: number;

  @ApiProperty({ example: 5000000 })
  totalRevenue!: number;

  @ApiProperty({ example: 10 })
  recentSignups!: number;
}
