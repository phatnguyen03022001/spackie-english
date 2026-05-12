// src/modules/recommend/recommend.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CACHE_TTL } from '@common/utils/cache.util';

@Injectable()
export class RecommendService {
  private readonly domain = 'recommend';

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Recommend public decks based on user's most-studied deck tags.
   * Fallback to popular decks (most cards).
   */
  async recommendDecks(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = `${this.domain}:decks:${userId}:${page}:${limit}`;
    const cached = await this.cacheManager.get<{
      data: any[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    // Get user's most-studied deck tags
    const userDecks = await this.prisma.deck.findMany({
      where: { userId, deletedAt: null },
      select: { tags: true },
    });

    const userTags = [...new Set(userDecks.flatMap((d) => d.tags))].slice(
      0,
      20,
    );

    let decks: any[];
    let total: number;

    if (userTags.length > 0) {
      // Find public decks with overlapping tags, excluding user's own decks
      const where: Prisma.DeckWhereInput = {
        userId: { not: userId },
        visibility: 'PUBLIC',
        deletedAt: null,
        tags: { hasSome: userTags },
      };

      [decks, total] = await Promise.all([
        this.prisma.deck.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { totalCards: 'desc' },
          include: {
            user: {
              select: { displayName: true, username: true },
            },
          },
        }),
        this.prisma.deck.count({ where }),
      ]);
    } else {
      // Fallback: popular public decks
      const where: Prisma.DeckWhereInput = {
        userId: { not: userId },
        visibility: 'PUBLIC',
        deletedAt: null,
      };

      [decks, total] = await Promise.all([
        this.prisma.deck.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { totalCards: 'desc' },
          include: {
            user: {
              select: { displayName: true, username: true },
            },
          },
        }),
        this.prisma.deck.count({ where }),
      ]);
    }

    const data = decks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      coverUrl: deck.coverUrl,
      tags: deck.tags,
      totalCards: deck.totalCards,
      ownerName: deck.user?.displayName || deck.user?.username || 'Unknown',
    }));

    const result = { data, total };
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.LONG); // 30 min
    return result;
  }

  /**
   * Suggest next cards for review: due cards sorted by easeFactor ascending.
   */
  async recommendReview(userId: string, limit: number): Promise<any[]> {
    const cacheKey = `${this.domain}:review:${userId}:${limit}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();

    const progress = await this.prisma.cardProgress.findMany({
      where: {
        userId,
        dueDate: { lte: now },
      },
      orderBy: { easeFactor: 'asc' },
      take: limit,
      include: {
        globalCard: {
          select: {
            id: true,
            front: true,
            back: true,
            imageUrl: true,
          },
        },
      },
    });

    const result = progress.map((p) => ({
      cardId: p.globalCard.id,
      front: p.globalCard.front,
      back: p.globalCard.back,
      imageUrl: p.globalCard.imageUrl,
      easeFactor: p.easeFactor,
      interval: p.interval,
      repetitions: p.repetitions,
      dueDate: p.dueDate,
    }));

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  }

  /**
   * List cards user struggles with (low accuracy or stuck cards).
   */
  async recommendWeakWords(userId: string): Promise<any[]> {
    const cacheKey = `${this.domain}:weak:${userId}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    // Find cards where:
    // 1. Listening accuracy < 70%, OR
    // 2. repetitions > 3 but interval <= 3 days (stuck)
    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    // Get card IDs with low listening accuracy
    const lowAccuracyPractices = await this.prisma.listeningPractice.findMany({
      where: {
        userId,
        accuracy: { not: null, lt: 70 },
      },
      select: { globalCardId: true },
      distinct: ['globalCardId'],
    });

    const lowAccuracyCardIds = lowAccuracyPractices
      .map((p) => p.globalCardId)
      .filter(Boolean) as string[];

    // Get stuck cards from CardProgress
    const stuckProgress = await this.prisma.cardProgress.findMany({
      where: {
        userId,
        repetitions: { gt: 3 },
        interval: { lte: 3 },
        dueDate: { lte: now },
      },
      include: {
        globalCard: {
          select: {
            id: true,
            front: true,
            back: true,
            imageUrl: true,
          },
        },
      },
    });

    // Combine and deduplicate
    const weakCardMap = new Map<string, any>();

    // Add stuck cards
    for (const p of stuckProgress) {
      weakCardMap.set(p.globalCard.id, {
        cardId: p.globalCard.id,
        front: p.globalCard.front,
        back: p.globalCard.back,
        imageUrl: p.globalCard.imageUrl,
        reason: 'stuck',
        easeFactor: p.easeFactor,
        interval: p.interval,
        repetitions: p.repetitions,
      });
    }

    // Add low accuracy cards
    if (lowAccuracyCardIds.length > 0) {
      const lowAccuracyCards = await this.prisma.globalCard.findMany({
        where: { id: { in: lowAccuracyCardIds } },
        select: { id: true, front: true, back: true, imageUrl: true },
      });

      for (const card of lowAccuracyCards) {
        if (!weakCardMap.has(card.id)) {
          weakCardMap.set(card.id, {
            cardId: card.id,
            front: card.front,
            back: card.back,
            imageUrl: card.imageUrl,
            reason: 'low_accuracy',
          });
        }
      }
    }

    const result = Array.from(weakCardMap.values()).slice(0, 50);
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.LONG);
    return result;
  }

  /**
   * Invalidate recommendation caches.
   */
  async invalidateCache(userId?: string): Promise<void> {
    if (userId) {
      await this.cacheManager.delPattern(`${this.domain}:*:${userId}:*`);
    } else {
      await this.cacheManager.delPattern(`${this.domain}:*`);
    }
  }
}
