// src/modules/vocab/services/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CardStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Lấy thông số Dashboard từ UserStats (Cực nhanh)
   */
  async getUserDashboardStats(userId: string) {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      return {
        totalWords: 0,
        learnedWords: 0,
        masteredWords: 0,
        masteryRate: 0,
      };
    }

    return {
      totalWords: stats.totalWords,
      learnedWords: stats.learnedWords,
      masteredWords: stats.masteredWords,
      totalReviews: stats.totalReviews,
      masteryRate:
        stats.totalWords > 0
          ? Math.round((stats.masteredWords / stats.totalWords) * 100)
          : 0,
    };
  }

  /**
   * 2. Thống kê theo bộ thẻ (Học hiệu quả nhất)
   * Vẫn dùng groupBy trên Card nhưng chỉ lọc những thẻ MASTERED
   */
  async getTopPerformingDecks(userId: string, limit = 3) {
    const deckStats = await this.prisma.card.groupBy({
      by: ['deckId'],
      where: {
        userId,
        status: CardStatus.MASTERED,
        deckId: { not: null },
      },
      _count: { deckId: true },
      orderBy: { _count: { deckId: 'desc' } },
      take: limit,
    });

    // Ép kiểu mảng ID để truy vấn
    const deckIds = deckStats
      .map((s) => s.deckId)
      .filter((id): id is string => !!id);

    const decks = await this.prisma.deck.findMany({
      where: { id: { in: deckIds } },
      select: { id: true, title: true },
    });

    // Tạo một Map để lookup title nhanh hơn thay vì dùng .find() trong loop
    const deckMap = new Map(decks.map((d) => [d.id, d.title]));

    return deckStats
      .filter((s): s is typeof s & { deckId: string } => s.deckId !== null)
      .map((stat) => ({
        id: stat.deckId,
        title: deckMap.get(stat.deckId) ?? 'Unknown Deck',
        masteredCount: stat._count.deckId,
      }));
  }

  /**
   * 3. Heatmap dựa trên LearningSession (Thay cho ReviewLog)
   */
  async getHeatmap(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await this.prisma.learningSession.findMany({
      where: {
        userId,
        endTime: { not: null }, // Chốt: Chỉ lấy session thành công
        startTime: { gte: thirtyDaysAgo },
      },
      select: { startTime: true, cardsProcessed: true },
    });

    const heatmap: Record<string, number> = {};
    sessions.forEach((s) => {
      const dateKey = s.startTime.toISOString().split('T')[0];
      heatmap[dateKey] = (heatmap[dateKey] || 0) + s.cardsProcessed;
    });
    return heatmap;
  }

  /**
   * Dự báo (Forecast): Chuyển từ ReviewService sang Analytics cho đúng vai trò
   */
  async getReviewForecast(userId: string) {
    const cards = await this.prisma.card.findMany({
      where: { userId, status: { not: CardStatus.NEW } },
      select: { nextReview: true },
    });

    const forecast: Record<string, number> = {};
    cards.forEach((card) => {
      const dateKey = card.nextReview.toISOString().split('T')[0];
      forecast[dateKey] = (forecast[dateKey] || 0) + 1;
    });
    return forecast;
  }

  async getDeckLearningAnalytics(deckId: string, userId: string) {
    const [totalCards, masteredCards] = await Promise.all([
      this.prisma.card.count({ where: { deckId, userId } }),
      this.prisma.card.count({
        where: { deckId, userId, status: CardStatus.MASTERED },
      }),
    ]);

    return {
      totalCards,
      masteredCards,
      progress:
        totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0,
    };
  }
}
