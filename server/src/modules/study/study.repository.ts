// src/modules/study/study.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CardProgress, Prisma, $Enums } from '@prisma/client';

@Injectable()
export class StudyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCardProgress(
    userId: string,
    globalCardId: string,
  ): Promise<CardProgress | null> {
    try {
      return this.prisma.cardProgress.findUnique({
        where: { userId_globalCardId: { userId, globalCardId } },
      });
    } catch {
      return null;
    }
  }

  async upsertCardProgress(
    userId: string,
    globalCardId: string,
    data: {
      easeFactor: number;
      interval: number;
      repetitions: number;
      dueDate: Date;
      lastRating?: $Enums.CardRating;
      reviewCount: number;
      recentReviews: Prisma.InputJsonValue[];
      lastReviewAt: Date;
    },
  ): Promise<CardProgress> {
    return this.prisma.cardProgress.upsert({
      where: { userId_globalCardId: { userId, globalCardId } },
      create: {
        userId,
        globalCardId,
        easeFactor: data.easeFactor ?? 2.5,
        interval: data.interval ?? 0,
        repetitions: data.repetitions ?? 0,
        dueDate: data.dueDate ?? new Date(),
        lastRating: data.lastRating,
        reviewCount: data.reviewCount ?? 0,
        recentReviews: data.recentReviews ?? [],
        lastReviewAt: data.lastReviewAt ?? new Date(),
      },
      update: {
        easeFactor: data.easeFactor,
        interval: data.interval,
        repetitions: data.repetitions,
        dueDate: data.dueDate,
        lastRating: data.lastRating,
        reviewCount: data.reviewCount,
        recentReviews: data.recentReviews,
        lastReviewAt: data.lastReviewAt ?? new Date(),
      },
    });
  }

  async countDueCards(userId: string, deckId?: string): Promise<number> {
    const where: Prisma.CardProgressWhereInput = {
      userId,
      dueDate: { lte: new Date() },
    };

    if (deckId) {
      where.globalCard = {
        deckMappings: { some: { deckId } },
      };
    }

    return this.prisma.cardProgress.count({ where });
  }

  async findDueCards(
    userId: string,
    skip: number,
    take: number,
    deckId?: string,
  ): Promise<{
    items: Array<
      CardProgress & {
        globalCard: {
          id: string;
          front: string;
          back: string | null;
          imageUrl: string | null;
          audioUrl: string | null;
          extras: unknown;
        };
      }
    >;
    total: number;
  }> {
    const where: Prisma.CardProgressWhereInput = {
      userId,
      dueDate: { lte: new Date() },
    };

    if (deckId) {
      where.globalCard = {
        deckMappings: { some: { deckId } },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.cardProgress.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        include: {
          globalCard: {
            select: {
              id: true,
              front: true,
              back: true,
              imageUrl: true,
              audioUrl: true,
              extras: true,
            },
          },
        },
      }),
      this.prisma.cardProgress.count({ where }),
    ]);

    return { items, total };
  }

  async updateUserStreak(
    userId: string,
    currentStreak: number,
    longestStreak: number,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak,
        longestStreak,
        lastStudiedAt: new Date(),
        totalCardsLearned: { increment: 1 },
      },
    });
  }

  async findMany(where: { userId: string; globalCardId?: string }): Promise<
    Array<{
      globalCardId: string;
      recentReviews: unknown;
      globalCard?: { front: string } | null;
    }>
  > {
    return this.prisma.cardProgress.findMany({
      where,
      select: {
        globalCardId: true,
        recentReviews: true,
        globalCard: { select: { front: true } },
      },
    });
  }

  async getUserStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastStudiedAt: Date | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStudiedAt: true,
      },
    });

    return {
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      lastStudiedAt: user?.lastStudiedAt ?? null,
    };
  }
}
