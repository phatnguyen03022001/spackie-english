// src/modules/statistics/statistics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import {
  STUDY_EVENTS,
  LISTENING_EVENTS,
  USER_EVENTS,
  PAYMENT_EVENTS,
  CARD_EVENTS,
} from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import type {
  DashboardStatsDto,
  AdminOverviewDto,
} from '@modules/statistics/dto/dashboard-stats.dto';
import type { VideoStatisticsResponseDto } from '@modules/statistics/dto/video-statistics.dto';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  async getDashboard(userId: string): Promise<DashboardStatsDto> {
    const cacheKey = CacheKeyBuilder.userResource(
      'statistics',
      'dashboard',
      userId,
    );
    const cached = await this.cacheManager.get<DashboardStatsDto>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalCardsLearned: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    // Sum reviewCount across all card progress records for accurate total
    const reviewCounts = await this.prisma.cardProgress.findMany({
      where: { userId },
      select: { reviewCount: true },
    });
    const totalReviews = reviewCounts.reduce(
      (sum, cp) => sum + cp.reviewCount,
      0,
    );

    const listeningPractices = await this.prisma.listeningPractice.findMany({
      where: { userId },
      select: { accuracy: true, duration: true },
    });

    const totalListeningPractices = listeningPractices.length;
    const averageAccuracy =
      totalListeningPractices > 0
        ? listeningPractices.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) /
          totalListeningPractices
        : 0;

    const totalStudyTime = listeningPractices.reduce(
      (sum, p) => sum + (p.duration ?? 0),
      0,
    );

    // Calculate totalMastered: cards with interval >= 21 days or repetitions >= 5
    const masteredCards = await this.prisma.cardProgress.findMany({
      where: {
        userId,
        OR: [{ interval: { gte: 21 } }, { repetitions: { gte: 5 } }],
      },
      select: { globalCardId: true },
    });
    const totalMastered = masteredCards.length;

    // Get daily activity for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReviews = await this.prisma.cardProgress.findMany({
      where: { userId, lastReviewAt: { gte: sevenDaysAgo } },
      select: { lastReviewAt: true },
    });

    const recentListening = await this.prisma.listeningPractice.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, duration: true },
    });

    const dailyActivity = this.buildDailyActivity(
      sevenDaysAgo,
      recentReviews,
      recentListening,
    );

    const result: DashboardStatsDto = {
      totalCardsLearned: user?.totalCardsLearned ?? 0,
      totalReviews,
      totalMastered,
      totalListeningPractices,
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      averageAccuracy,
      totalStudyTime,
      dailyActivity,
    };

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  }

  async getAdminOverview(): Promise<AdminOverviewDto> {
    const cacheKey = 'statistics:admin:overview';
    const cached = await this.cacheManager.get<AdminOverviewDto>(cacheKey);
    if (cached) return cached;

    const [totalUsers, activeSubscriptions, payments] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESS' },
      }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSignups = await this.prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
    });

    const result: AdminOverviewDto = {
      totalUsers,
      activeSubscriptions,
      totalRevenue: payments._sum.amount ?? 0,
      recentSignups,
    };

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  async getVideoStats(userId: string): Promise<VideoStatisticsResponseDto> {
    const cacheKey = CacheKeyBuilder.userResource(
      'statistics',
      'videos',
      userId,
    );
    const cached =
      await this.cacheManager.get<VideoStatisticsResponseDto>(cacheKey);
    if (cached) return cached;

    const practices = await this.prisma.listeningPractice.findMany({
      where: {
        userId,
        type: 'YOUTUBE_SYNC',
        youtubeId: { not: null },
      },
      select: {
        youtubeId: true,
        duration: true,
        createdAt: true,
      },
    });

    // Helper: get Monday of the week
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    // Group by week
    const weeklyMap = new Map<
      string,
      { totalDuration: number; videos: Set<string> }
    >();
    // Group by month
    const monthlyMap = new Map<
      string,
      { totalDuration: number; videos: Set<string> }
    >();
    let allTimeDuration = 0;
    const allTimeVideos = new Set<string>();

    for (const p of practices) {
      const date = new Date(p.createdAt);
      const weekKey = getWeekStart(date).toISOString().slice(0, 10);
      const monthKey = date.toISOString().slice(0, 7);

      if (!weeklyMap.has(weekKey))
        weeklyMap.set(weekKey, { totalDuration: 0, videos: new Set() });
      weeklyMap.get(weekKey)!.totalDuration += p.duration;
      weeklyMap.get(weekKey)!.videos.add(p.youtubeId!);

      if (!monthlyMap.has(monthKey))
        monthlyMap.set(monthKey, { totalDuration: 0, videos: new Set() });
      monthlyMap.get(monthKey)!.totalDuration += p.duration;
      monthlyMap.get(monthKey)!.videos.add(p.youtubeId!);

      allTimeDuration += p.duration;
      allTimeVideos.add(p.youtubeId!);
    }

    const weekly = Array.from(weeklyMap.entries())
      .map(([weekStart, data]) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
        return {
          weekStart,
          weekEnd: weekEnd.toISOString().slice(0, 10),
          totalDurationSec: data.totalDuration,
          uniqueVideos: data.videos.size,
        };
      })
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        totalDurationSec: data.totalDuration,
        uniqueVideos: data.videos.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const result: VideoStatisticsResponseDto = {
      weekly,
      monthly,
      allTime: {
        totalDurationSec: allTimeDuration,
        uniqueVideos: allTimeVideos.size,
      },
    };

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  @OnEvent(STUDY_EVENTS.CARD_REVIEWED)
  async handleCardReviewed(payload: { userId: string; globalCardId: string }) {
    // Update user's totalCardsLearned and streak
    await this.prisma.user.update({
      where: { id: payload.userId },
      data: {
        totalCardsLearned: { increment: 1 },
        lastStudiedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheManager.delPattern(
      `statistics:dashboard:${payload.userId}`,
    );
  }

  @OnEvent(LISTENING_EVENTS.COMPLETED)
  async handleListeningCompleted(payload: {
    userId: string;
    practiceId: string;
  }) {
    // Update lastStudiedAt
    await this.prisma.user.update({
      where: { id: payload.userId },
      data: { lastStudiedAt: new Date() },
    });

    // Invalidate cache
    await this.cacheManager.delPattern(
      `statistics:dashboard:${payload.userId}`,
    );
    await this.cacheManager.delPattern(`statistics:videos:${payload.userId}`);
  }

  @OnEvent(USER_EVENTS.CREATED)
  async handleUserRegistered(payload: { userId: string }) {
    // Invalidate admin overview cache
    await this.cacheManager.del('statistics:admin:overview');
  }

  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATED)
  async handlePaymentSucceeded(payload: {
    userId: string;
    plan: string;
    amount: number;
  }) {
    // Invalidate admin overview cache
    await this.cacheManager.del('statistics:admin:overview');
  }

  @OnEvent(CARD_EVENTS.CREATED)
  async handleCardCreated(payload: { userId: string }) {
    // Invalidate dashboard cache for user
    await this.cacheManager.delPattern(
      `statistics:dashboard:${payload.userId}`,
    );
  }

  private buildDailyActivity(
    startDate: Date,
    reviews: { lastReviewAt: Date | null }[],
    listening: { createdAt: Date; duration: number }[],
  ): DashboardStatsDto['dailyActivity'] {
    const activityMap = new Map<
      string,
      { reviews: number; listeningPractices: number; studyTime: number }
    >();

    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      activityMap.set(key, { reviews: 0, listeningPractices: 0, studyTime: 0 });
    }

    for (const review of reviews) {
      if (review.lastReviewAt) {
        const key = review.lastReviewAt.toISOString().split('T')[0];
        const entry = activityMap.get(key);
        if (entry) entry.reviews++;
      }
    }

    for (const practice of listening) {
      const key = practice.createdAt.toISOString().split('T')[0];
      const entry = activityMap.get(key);
      if (entry) {
        entry.listeningPractices++;
        entry.studyTime += practice.duration;
      }
    }

    return Array.from(activityMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }
}
