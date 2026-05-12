// src/modules/bulk/bulk.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@database/prisma.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Verify ownership of a deck.
   */
  private async verifyDeckOwnership(
    deckId: string,
    userId: string,
  ): Promise<void> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true, userId: true },
    });
    if (!deck) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        `Deck ${deckId} not found`,
      );
    }
    if (deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You do not own this deck',
      );
    }
  }

  /**
   * Bulk delete cards.
   */
  async bulkDeleteCards(
    userId: string,
    cardIds: string[],
    deckId?: string,
  ): Promise<{ deletedCount: number }> {
    if (deckId) {
      // Only remove the mapping from the deck (unlink)
      await this.verifyDeckOwnership(deckId, userId);

      // Delete mappings for the specified deck where user owns the deck
      const mappings = await this.prisma.deckCardMapping.findMany({
        where: {
          deckId,
          globalCardId: { in: cardIds },
        },
        include: { deck: { select: { userId: true } } },
      });

      const ownedIds = mappings
        .filter((m) => m.deck.userId === userId)
        .map((m) => m.id);

      const result = await this.prisma.deckCardMapping.deleteMany({
        where: { id: { in: ownedIds } },
      });

      return { deletedCount: result.count };
    }

    // Global delete: verify user owns all decks that reference these cards
    const mappings = await this.prisma.deckCardMapping.findMany({
      where: {
        globalCardId: { in: cardIds },
      },
      include: { deck: { select: { userId: true } } },
    });

    const nonOwnedMapping = mappings.find((m) => m.deck.userId !== userId);
    if (nonOwnedMapping) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.BULK_ACCESS_DENIED,
        `Card ${nonOwnedMapping.globalCardId} is used in a deck you do not own`,
      );
    }

    // Delete mappings first
    await this.prisma.deckCardMapping.deleteMany({
      where: { globalCardId: { in: cardIds } },
    });

    // Then delete the global cards
    const result = await this.prisma.globalCard.deleteMany({
      where: { id: { in: cardIds } },
    });

    // Emit events for each deleted card
    for (const cardId of cardIds) {
      this.eventEmitter.emit('card.deleted', { cardId, userId });
    }

    return { deletedCount: result.count };
  }

  /**
   * Bulk move cards from source deck to target deck.
   */
  async bulkMoveCards(
    userId: string,
    cardIds: string[],
    sourceDeckId: string,
    targetDeckId: string,
  ): Promise<{ movedCount: number }> {
    await Promise.all([
      this.verifyDeckOwnership(sourceDeckId, userId),
      this.verifyDeckOwnership(targetDeckId, userId),
    ]);

    // Update mappings: change deckId from sourceDeckId to targetDeckId
    const result = await this.prisma.deckCardMapping.updateMany({
      where: {
        deckId: sourceDeckId,
        globalCardId: { in: cardIds },
      },
      data: { deckId: targetDeckId },
    });

    return { movedCount: result.count };
  }

  /**
   * Bulk update card fields.
   */
  async bulkUpdateCards(
    userId: string,
    cardIds: string[],
    updates: {
      front?: string;
      back?: string;
      imageUrl?: string;
      audioUrl?: string;
      extras?: Record<string, unknown>;
    },
  ): Promise<{ updatedCount: number }> {
    // Verify ownership: user must own decks containing these cards
    const mappings = await this.prisma.deckCardMapping.findMany({
      where: {
        globalCardId: { in: cardIds },
      },
      include: { deck: { select: { userId: true } } },
    });

    const nonOwnedMapping = mappings.find((m) => m.deck.userId !== userId);
    if (nonOwnedMapping) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.BULK_ACCESS_DENIED,
        `Card ${nonOwnedMapping.globalCardId} is used in a deck you do not own`,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (updates.front !== undefined) updateData.front = updates.front;
    if (updates.back !== undefined) updateData.back = updates.back;
    if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;
    if (updates.audioUrl !== undefined) updateData.audioUrl = updates.audioUrl;
    if (updates.extras !== undefined) updateData.extras = updates.extras;

    if (Object.keys(updateData).length === 0) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        'No valid fields to update',
      );
    }

    const result = await this.prisma.globalCard.updateMany({
      where: { id: { in: cardIds } },
      data: updateData,
    });

    return { updatedCount: result.count };
  }
}
