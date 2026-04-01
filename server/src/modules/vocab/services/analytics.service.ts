import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CardStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const deckIds = deckStats
      .map((s) => s.deckId)
      .filter((id): id is string => !!id);

    const decks = await this.prisma.deck.findMany({
      where: { id: { in: deckIds } },
      select: { id: true, title: true },
    });

    const existingDeckIds = new Set(decks.map((d) => d.id));
    const deckMap = new Map(decks.map((d) => [d.id, d.title]));

    // Loại bỏ deckId không tồn tại để tránh trả về orphan.
    return deckStats
      .filter(
        (s): s is typeof s & { deckId: string } =>
          s.deckId !== null && existingDeckIds.has(s.deckId),
      )
      .map((stat) => ({
        id: stat.deckId,
        title: deckMap.get(stat.deckId) ?? 'Unknown Deck',
        masteredCount: stat._count.deckId,
      }));
  }
}
