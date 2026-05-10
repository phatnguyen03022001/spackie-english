// src/modules/statistics/statistics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import {
  STUDY_EVENTS,
  LISTENING_EVENTS,
} from '@common/constants/events.constants';
import type {
  IDashboardStats,
  IAdminOverview,
} from '@modules/statistics/interfaces/statistics.interface';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getDashboard(userId: string): Promise<IDashboardStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalCardsLearned: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    const totalReviews = await this.prisma.cardProgress.count({
      where: { userId, lastReviewAt: { not: null } },
    });

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

    return {
      totalCardsLearned: user?.totalCardsLearned ?? 0,
      totalReviews,
      totalListeningPractices,
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      averageAccuracy,
      totalStudyTime,
      dailyActivity,
    };
  }

  async getAdminOverview(): Promise<IAdminOverview> {
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

    return {
      totalUsers,
      activeSubscriptions,
      totalRevenue: payments._sum.amount ?? 0,
      recentSignups,
    };
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
  }

  private buildDailyActivity(
    startDate: Date,
    reviews: { lastReviewAt: Date | null }[],
    listening: { createdAt: Date; duration: number }[],
  ): IDashboardStats['dailyActivity'] {
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
