// src/modules/decks/decks.service.ts
import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { DecksRepository } from '@modules/decks/decks.repository';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { CreateDeckDto } from '@modules/decks/dto/create-deck.dto';
import { UpdateDeckDto } from '@modules/decks/dto/update-deck.dto';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';
import { ReorderCardsDto } from '@modules/decks/dto/reorder-cards.dto';
import { CloneDeckDto } from '@modules/decks/dto/clone-deck.dto';
import { ImportDeckDto } from '@modules/decks/dto/import-deck.dto';
import {
  ExportedDeckDto,
  ExportedCardDto,
} from '@modules/decks/dto/export-deck.dto';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DECK_EVENTS } from '@common/constants/events.constants';
import { StorageService } from '@infrastructure/storage/storage.service';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DecksService {
  private readonly domain = 'decks';
  private readonly logger = new Logger(DecksService.name);

  constructor(
    private readonly repository: DecksRepository,
    private readonly mapper: DeckMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, dto: CreateDeckDto): Promise<DeckResponseDto> {
    const deck = await this.repository.create({
      title: dto.title,
      description: dto.description,
      visibility: dto.visibility,
      tags: dto.tags || [],
      isVipOnly: dto.isVipOnly || false,
      user: { connect: { id: userId } },
    });

    await this.invalidateListCache(userId);
    this.eventEmitter.emit(DECK_EVENTS.CREATED, { deckId: deck.id, userId });
    return this.mapper.toResponseDto(deck);
  }

  async findOwnDecks(
    userId: string,
    query: DeckListQueryDto,
  ): Promise<{ data: DeckResponseDto[]; total: number }> {
    const filters: Record<string, string | number> = {
      userId,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    };
    if (query.search) filters.search = query.search;
    if (query.visibility) filters.visibility = query.visibility;
    if (query.tag) filters.tag = query.tag;
    if (query.isVipOnly !== undefined)
      filters.isVipOnly = Number(query.isVipOnly);

    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      'own',
      query.page,
      query.limit,
      filters,
    );
    const cached = await this.cacheManager.get<{
      data: DeckResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const { decks, total } = await this.repository.findOwnDecks(userId, query);
    const data = this.mapper.toResponseDtoList(decks);
    const result = { data, total };
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.LIST);
    return result;
  }

  async findPublicDecks(
    query: DeckListQueryDto,
  ): Promise<{ data: DeckResponseDto[]; total: number }> {
    const filters: Record<string, string | number> = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    };
    if (query.search) filters.search = query.search;
    if (query.tag) filters.tag = query.tag;

    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      'public',
      query.page,
      query.limit,
      filters,
    );
    const cached = await this.cacheManager.get<{
      data: DeckResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const { decks, total } = await this.repository.findPublicDecks(query);
    const data = this.mapper.toResponseDtoList(decks);
    const result = { data, total };
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.LIST);
    return result;
  }

  async findById(id: string, userId?: string): Promise<DeckResponseDto> {
    const cacheKey = CacheKeyBuilder.resource(this.domain, 'deck', id);
    const cached = await this.cacheManager.get<DeckResponseDto>(cacheKey);
    if (cached) return cached;

    const deck = await this.repository.findById(id);
    if (!deck) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DECK_NOT_FOUND',
        'Deck not found',
      );
    }

    // Check visibility & ownership
    if (deck.visibility === 'PRIVATE' && userId !== deck.userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_PRIVATE',
        'This deck is private',
      );
    }

    // Check VIP-only access
    if (deck.isVipOnly && userId !== deck.userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_VIP_ONLY',
        'This deck requires VIP subscription',
      );
    }

    const dto = this.mapper.toResponseDto(deck);
    await this.cacheManager.set(cacheKey, dto, CACHE_TTL.MEDIUM);
    return dto;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateDeckDto,
  ): Promise<DeckResponseDto> {
    const deck = await this.repository.findById(id);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    const updated = await this.repository.update(id, dto);
    await this.invalidateCache(id, userId);
    this.eventEmitter.emit(DECK_EVENTS.UPDATED, { deckId: id, userId });
    return this.mapper.toResponseDto(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const deck = await this.repository.findById(id);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // Xoá mapping trước khi soft delete deck
    await this.repository.deleteMappings(id);
    await this.repository.softDelete(id);
    await this.invalidateCache(id, userId);
    this.eventEmitter.emit(DECK_EVENTS.DELETED, { deckId: id, userId });
  }

  async deleteCover(userId: string, deckId: string): Promise<DeckResponseDto> {
    const deck = await this.repository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // Xoá file trên storage nếu có
    if (deck.coverUrl) {
      const publicId = this.extractPublicIdFromUrl(deck.coverUrl);
      if (publicId) {
        await this.storageService.delete(publicId).catch((err: unknown) => {
          this.logger.warn(
            `Failed to delete old cover: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }
    }

    const updated = await this.repository.update(deckId, { coverUrl: null });
    await this.invalidateCache(deckId, userId);
    return this.mapper.toResponseDto(updated);
  }

  async reorderCards(
    userId: string,
    deckId: string,
    dto: ReorderCardsDto,
  ): Promise<void> {
    const deck = await this.repository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // Lấy tất cả mapping của deck để kiểm tra cardId hợp lệ
    const mappings = await this.repository.findMappingsByDeckId(deckId);
    const mappingMap = new Map(mappings.map((m) => [m.globalCardId, m.id]));

    const updates = dto.items
      .filter((item) => mappingMap.has(item.cardId))
      .map((item) => ({
        id: mappingMap.get(item.cardId)!,
        sortOrder: item.sortOrder,
      }));

    if (updates.length === 0) return;

    await this.repository.batchUpdateSortOrder(updates);

    // Invalidate caches
    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'deck', deckId),
    );
    await this.cacheManager.delPattern(`cards:deck:${deckId}:*`);
  }

  async cloneDeck(
    userId: string,
    deckId: string,
    dto: CloneDeckDto,
  ): Promise<DeckResponseDto> {
    const sourceDeck = await this.repository.findById(deckId);
    if (!sourceDeck) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DECK_NOT_FOUND',
        'Deck not found',
      );
    }

    // Cho phép clone cả public deck của người khác
    const newTitle = dto.title || `${sourceDeck.title} (Copy)`;
    const newDeck = await this.repository.create({
      title: newTitle,
      description: sourceDeck.description,
      visibility: dto.visibility ?? 'PRIVATE',
      tags: sourceDeck.tags,
      isVipOnly: sourceDeck.isVipOnly,
      user: { connect: { id: userId } },
    });

    await this.repository.cloneMappings(deckId, newDeck.id);

    // Cập nhật totalCards
    const mappingCount = await this.repository
      .findMappingsByDeckId(newDeck.id)
      .then((m) => m.length);
    await this.repository.update(newDeck.id, { totalCards: mappingCount });

    await this.invalidateListCache(userId);
    this.eventEmitter.emit(DECK_EVENTS.CREATED, {
      deckId: newDeck.id,
      userId,
    });
    return this.mapper.toResponseDto(newDeck);
  }

  // ------------------- Export deck -------------------
  async exportDeck(userId: string, deckId: string): Promise<ExportedDeckDto> {
    const deck = await this.repository.findById(deckId);
    if (!deck) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DECK_NOT_FOUND',
        'Deck not found',
      );
    }

    // Check visibility & ownership
    if (deck.visibility === 'PRIVATE' && userId !== deck.userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_PRIVATE',
        'This deck is private',
      );
    }

    // Get all cards in deck via Prisma directly
    const mappings = await this.prisma.deckCardMapping.findMany({
      where: { deckId },
      include: { globalCard: true },
      orderBy: { sortOrder: 'asc' },
    });
    const cards: ExportedCardDto[] = mappings.map((m) => ({
      front: m.globalCard.front,
      back: m.globalCard.back || undefined,
      extras: (m.globalCard.extras as Record<string, unknown>) || undefined,
    }));

    return {
      title: deck.title,
      description: deck.description || undefined,
      tags: deck.tags,
      exportedAt: new Date().toISOString(),
      cards,
    };
  }

  // ------------------- Import deck -------------------
  async importDeck(
    userId: string,
    dto: ImportDeckDto,
  ): Promise<DeckResponseDto> {
    // Create deck
    const deck = await this.repository.create({
      title: dto.title,
      description: dto.description,
      visibility: 'PRIVATE',
      tags: dto.tags || [],
      isVipOnly: false,
      user: { connect: { id: userId } },
    });

    // Import cards
    if (dto.cards && dto.cards.length > 0) {
      for (const cardDto of dto.cards) {
        // Find or create GlobalCard via Prisma directly
        let globalCard = await this.prisma.globalCard.findUnique({
          where: { front: cardDto.front },
        });
        if (!globalCard) {
          globalCard = await this.prisma.globalCard.create({
            data: {
              front: cardDto.front,
              back: cardDto.back || '',
              extras: (cardDto.extras ?? {}) as Prisma.InputJsonValue,
              status: 'completed',
              validated: true,
              valid: true,
            },
          });
        }

        // Create mapping
        if (globalCard) {
          const exists = await this.prisma.deckCardMapping.findUnique({
            where: {
              deckId_globalCardId: {
                deckId: deck.id,
                globalCardId: globalCard.id,
              },
            },
          });
          if (!exists) {
            await this.prisma.deckCardMapping.create({
              data: {
                deckId: deck.id,
                globalCardId: globalCard.id,
              },
            });
          }
        }
      }

      // Update totalCards
      const mappingCount = await this.repository
        .findMappingsByDeckId(deck.id)
        .then((m) => m.length);
      await this.repository.update(deck.id, { totalCards: mappingCount });
    }

    await this.invalidateListCache(userId);
    this.eventEmitter.emit(DECK_EVENTS.CREATED, {
      deckId: deck.id,
      userId,
    });
    return this.mapper.toResponseDto(deck);
  }

  // ------------------- Get popular tags -------------------
  async getPopularTags(limit = 20): Promise<string[]> {
    const cacheKey = `${this.domain}:tags:popular`;
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) return cached;

    const tags = await this.repository.getPopularTags(limit);
    await this.cacheManager.set(cacheKey, tags, CACHE_TTL.MEDIUM);
    return tags;
  }

  // Các helper cache
  private async invalidateCache(deckId: string, userId: string): Promise<void> {
    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'deck', deckId),
    );
    await this.invalidateListCache(userId);
    await this.cacheManager.delPattern(`${this.domain}:public:*`);
  }

  private async invalidateListCache(userId: string): Promise<void> {
    // Pattern xóa tất cả cache list của user (bao gồm pagination, filter)
    const pattern = `${this.domain}:own:list:*:userId:${userId}:*`;
    await this.cacheManager.delPattern(pattern);
  }

  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/v\d+\/(.+)\.[a-z]+$/);
    return match ? match[1] : null;
  }
}
