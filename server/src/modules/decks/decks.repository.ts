// src/modules/decks/decks.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Deck, Prisma } from '@prisma/client';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';
import { parseSortQuery } from '@common/utils/pagination.util';

@Injectable()
export class DecksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DeckCreateInput): Promise<Deck> {
    return this.prisma.deck.create({
      data: { ...data, deletedAt: null },
    });
  }

  async findById(id: string): Promise<Deck | null> {
    try {
      const deck = await this.prisma.deck.findUnique({
        where: { id },
      });
      if (deck && deck.deletedAt) return null;
      return deck;
    } catch {
      // Invalid ObjectId format or other Prisma error
      return null;
    }
  }

  async findOwnDecks(
    userId: string,
    query: DeckListQueryDto,
  ): Promise<{ decks: Deck[]; total: number }> {
    const { page, limit, search, visibility, tag, isVipOnly, sort } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.DeckWhereInput = { userId, deletedAt: null };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (visibility) where.visibility = visibility;
    if (tag) where.tags = { has: tag };
    if (isVipOnly !== undefined) where.isVipOnly = isVipOnly;

    const { field, order } = parseSortQuery(sort);
    const orderBy = { [field]: order } as Prisma.DeckOrderByWithRelationInput;

    const [decks, total] = await Promise.all([
      this.prisma.deck.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.deck.count({ where }),
    ]);
    return { decks, total };
  }

  async findPublicDecks(
    query: DeckListQueryDto,
  ): Promise<{ decks: Deck[]; total: number }> {
    const { page, limit, search, tag, sort } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.DeckWhereInput = {
      visibility: 'PUBLIC',
      deletedAt: null,
    };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (tag) where.tags = { has: tag };

    const { field, order } = parseSortQuery(sort);
    const orderBy = { [field]: order } as Prisma.DeckOrderByWithRelationInput;

    const [decks, total] = await Promise.all([
      this.prisma.deck.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.deck.count({ where }),
    ]);
    return { decks, total };
  }

  async update(id: string, data: Prisma.DeckUpdateInput): Promise<Deck> {
    return this.prisma.deck.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Deck> {
    return this.prisma.deck.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Xoá tất cả DeckCardMapping của một deck
  async deleteMappings(deckId: string): Promise<void> {
    await this.prisma.deckCardMapping.deleteMany({ where: { deckId } });
  }

  // Batch update sort order for deck card mappings
  async batchUpdateSortOrder(
    updates: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    await this.prisma.$transaction(
      updates.map(({ id, sortOrder }) =>
        this.prisma.deckCardMapping.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );
  }

  // Find all mappings for a deck
  async findMappingsByDeckId(
    deckId: string,
  ): Promise<Array<{ id: string; globalCardId: string; sortOrder: number }>> {
    return this.prisma.deckCardMapping.findMany({
      where: { deckId },
      select: { id: true, globalCardId: true, sortOrder: true },
    });
  }

  // Clone mappings from source deck to target deck
  async cloneMappings(
    sourceDeckId: string,
    targetDeckId: string,
  ): Promise<void> {
    const mappings = await this.prisma.deckCardMapping.findMany({
      where: { deckId: sourceDeckId },
      select: { globalCardId: true, sortOrder: true },
    });
    if (mappings.length === 0) return;

    await this.prisma.deckCardMapping.createMany({
      data: mappings.map((m) => ({
        deckId: targetDeckId,
        globalCardId: m.globalCardId,
        sortOrder: m.sortOrder,
      })),
    });
  }

  // Chỉ dùng trong CardsModule hoặc job để cập nhật totalCards
  async incrementTotalCards(id: string, delta: number): Promise<void> {
    await this.prisma.deck.update({
      where: { id },
      data: { totalCards: { increment: delta } },
    });
  }

  // Get popular tags across all public decks
  async getPopularTags(limit = 20): Promise<string[]> {
    const decks = await this.prisma.deck.findMany({
      where: { visibility: 'PUBLIC', deletedAt: null },
      select: { tags: true },
    });

    const tagCount = new Map<string, number>();
    for (const deck of decks) {
      for (const tag of deck.tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }

    return [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }
}
