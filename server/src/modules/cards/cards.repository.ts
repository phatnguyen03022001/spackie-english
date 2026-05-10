// src/modules/cards/cards.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { GlobalCard, DeckCardMapping, Prisma } from '@prisma/client';
import { LoggerService } from '@common/logger/logger.service';

@Injectable()
export class CardsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CardsRepository.name);
  }

  // ==================== GlobalCard ====================

  async findGlobalCardByFront(front: string): Promise<GlobalCard | null> {
    return this.prisma.globalCard.findUnique({ where: { front } });
  }

  async createGlobalCard(
    data: Prisma.GlobalCardCreateInput,
  ): Promise<GlobalCard> {
    return this.prisma.globalCard.create({ data });
  }

  async findGlobalCardById(id: string): Promise<GlobalCard | null> {
    return this.prisma.globalCard.findUnique({ where: { id } });
  }

  async updateGlobalCard(
    id: string,
    data: Prisma.GlobalCardUpdateInput,
  ): Promise<GlobalCard> {
    return this.prisma.globalCard.update({ where: { id }, data });
  }

  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<GlobalCard> {
    const data: Prisma.GlobalCardUpdateInput = { status };
    if (errorMessage !== undefined) {
      data.errorMessage = errorMessage;
    }
    return this.prisma.globalCard.update({ where: { id }, data });
  }

  async deleteGlobalCard(id: string): Promise<void> {
    await this.prisma.globalCard.delete({ where: { id } });
  }

  // ==================== DeckCardMapping ====================

  async createMapping(
    data: Prisma.DeckCardMappingCreateInput,
  ): Promise<DeckCardMapping> {
    return this.prisma.deckCardMapping.create({ data });
  }

  async deleteMapping(deckId: string, globalCardId: string): Promise<void> {
    await this.prisma.deckCardMapping.delete({
      where: {
        deckId_globalCardId: { deckId, globalCardId },
      },
    });
  }

  async findMappingsByDeck(
    deckId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<{
    mappings: (DeckCardMapping & { globalCard: GlobalCard })[];
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const where: Prisma.DeckCardMappingWhereInput = { deckId };

    if (search) {
      where.globalCard = {
        OR: [
          { front: { contains: search, mode: 'insensitive' } },
          { back: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [mappings, total] = await Promise.all([
      this.prisma.deckCardMapping.findMany({
        where,
        skip,
        take: limit,
        include: { globalCard: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.deckCardMapping.count({ where }),
    ]);
    return { mappings, total };
  }

  async mappingExists(deckId: string, globalCardId: string): Promise<boolean> {
    const mapping = await this.prisma.deckCardMapping.findUnique({
      where: {
        deckId_globalCardId: { deckId, globalCardId },
      },
    });
    return !!mapping;
  }

  async countMappingsByGlobalCard(globalCardId: string): Promise<number> {
    return this.prisma.deckCardMapping.count({ where: { globalCardId } });
  }

  // ==================== Batch Operations ====================

  async findGlobalCardsByFronts(
    fronts: string[],
  ): Promise<Map<string, GlobalCard>> {
    const cards = await this.prisma.globalCard.findMany({
      where: { front: { in: fronts } },
    });
    const map = new Map<string, GlobalCard>();
    for (const card of cards) {
      map.set(card.front, card);
    }
    return map;
  }

  async createMappingsBatch(deckId: string, cardIds: string[]): Promise<void> {
    if (cardIds.length === 0) return;

    const data = cardIds.map((globalCardId) => ({
      deckId,
      globalCardId,
    }));

    // MongoDB with Prisma does not support skipDuplicates
    // Use createMany and catch duplicate errors if needed
    try {
      await this.prisma.deckCardMapping.createMany({ data });
    } catch (error: unknown) {
      // P2002 = unique constraint violation (duplicate mapping)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Duplicate mappings are expected for existing cards, just log and continue
        this.logger.warn(`Duplicate mappings ignored for deck ${deckId}`);
      } else {
        throw error;
      }
    }
  }
}
