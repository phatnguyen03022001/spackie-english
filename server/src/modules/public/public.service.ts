// src/modules/public/public.service.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { LoggerService } from '@common/logger/logger.service';
import { DeckVisibility } from '@prisma/client';

export interface PublicUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  totalDecks: number;
  totalCards: number;
  joinedAt: Date;
}

export interface PublicDeckInfo {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  totalCards: number;
  ownerName: string;
  createdAt: Date;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PublicService.name);
  }

  async getUserProfile(userId: string): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.PUBLIC_USER_NOT_FOUND,
        'User not found',
      );
    }

    const [totalDecks, totalCards] = await Promise.all([
      this.prisma.deck.count({
        where: { userId, deletedAt: null, visibility: DeckVisibility.PUBLIC },
      }),
      this.prisma.deckCardMapping.count({
        where: {
          deck: { userId, deletedAt: null, visibility: DeckVisibility.PUBLIC },
        },
      }),
    ]);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl || undefined,
      bio: undefined,
      totalDecks,
      totalCards,
      joinedAt: user.createdAt,
    };
  }

  async getUserPublicDecks(
    userId: string,
    skip = 0,
    take = 20,
  ): Promise<{ decks: PublicDeckInfo[]; total: number }> {
    const [decks, total] = await Promise.all([
      this.prisma.deck.findMany({
        where: {
          userId,
          deletedAt: null,
          visibility: DeckVisibility.PUBLIC,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          coverUrl: true,
          totalCards: true,
          createdAt: true,
          user: { select: { displayName: true } },
        },
      }),
      this.prisma.deck.count({
        where: {
          userId,
          deletedAt: null,
          visibility: DeckVisibility.PUBLIC,
        },
      }),
    ]);

    return {
      decks: decks.map((deck) => ({
        id: deck.id,
        title: deck.title,
        description: deck.description || undefined,
        coverUrl: deck.coverUrl || undefined,
        totalCards: deck.totalCards,
        ownerName: deck.user.displayName || 'Unknown',
        createdAt: deck.createdAt,
      })),
      total,
    };
  }
}
