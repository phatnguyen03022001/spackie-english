// src/modules/search/search.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchDecks(
    userId: string,
    q: string,
    skip: number,
    take: number,
  ): Promise<{ decks: Array<Record<string, unknown>>; total: number }> {
    const where: Prisma.DeckWhereInput = {
      deletedAt: null,
      OR: [
        { userId, deletedAt: null },
        { visibility: 'PUBLIC', deletedAt: null },
      ],
      title: { contains: q, mode: 'insensitive' },
    };

    const [decks, total] = await Promise.all([
      this.prisma.deck.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { displayName: true, username: true },
          },
        },
      }),
      this.prisma.deck.count({ where }),
    ]);

    return { decks: decks as unknown as Array<Record<string, unknown>>, total };
  }

  async searchCards(
    userId: string,
    q: string,
    skip: number,
    take: number,
  ): Promise<{ cards: Array<Record<string, unknown>>; total: number }> {
    // Find cards where user has access (own decks or public decks)
    const accessibleDeckIds = await this.prisma.deck
      .findMany({
        where: {
          deletedAt: null,
          OR: [
            { userId, deletedAt: null },
            { visibility: 'PUBLIC', deletedAt: null },
          ],
        },
        select: { id: true },
      })
      .then((decks) => decks.map((d) => d.id));

    if (accessibleDeckIds.length === 0) {
      return { cards: [], total: 0 };
    }

    const where: Prisma.GlobalCardWhereInput = {
      deletedAt: null,
      OR: [
        { front: { contains: q, mode: 'insensitive' } },
        { back: { contains: q, mode: 'insensitive' } },
      ],
      deckMappings: {
        some: {
          deckId: { in: accessibleDeckIds },
        },
      },
    };

    const [cards, total] = await Promise.all([
      this.prisma.globalCard.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          deckMappings: {
            where: { deckId: { in: accessibleDeckIds } },
            take: 1,
            include: {
              deck: {
                include: {
                  user: {
                    select: { displayName: true, username: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.globalCard.count({ where }),
    ]);

    return { cards: cards as unknown as Array<Record<string, unknown>>, total };
  }

  async getSuggestions(userId: string, q: string): Promise<string[]> {
    // Get deck title suggestions
    const deckWhere: Prisma.DeckWhereInput = {
      deletedAt: null,
      OR: [
        { userId, deletedAt: null },
        { visibility: 'PUBLIC', deletedAt: null },
      ],
      title: { contains: q, mode: 'insensitive' },
    };

    const decks = await this.prisma.deck.findMany({
      where: deckWhere,
      select: { title: true },
      take: 5,
    });

    // Get card front suggestions
    const accessibleDeckIds = await this.prisma.deck
      .findMany({
        where: {
          deletedAt: null,
          OR: [
            { userId, deletedAt: null },
            { visibility: 'PUBLIC', deletedAt: null },
          ],
        },
        select: { id: true },
      })
      .then((d) => d.map((deck) => deck.id));

    const cardWhere: Prisma.GlobalCardWhereInput = {
      deletedAt: null,
      front: { contains: q, mode: 'insensitive' },
      ...(accessibleDeckIds.length > 0
        ? { deckMappings: { some: { deckId: { in: accessibleDeckIds } } } }
        : {}),
    };

    const cards = await this.prisma.globalCard.findMany({
      where: cardWhere,
      select: { front: true },
      take: 5,
    });

    // Merge and deduplicate, limit to 5
    const suggestions = [
      ...new Set([...decks.map((d) => d.title), ...cards.map((c) => c.front)]),
    ].slice(0, 5);

    return suggestions;
  }
}
