// src/modules/favorite/favorite.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FavoriteRepository } from '@modules/favorite/favorite.repository';
import { FavoriteResponseDto } from '@modules/favorite/dto/favorite-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { FAVORITE_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { getPaginationOffset } from '@common/utils/pagination.util';
import { plainToInstance } from 'class-transformer';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';

@Injectable()
export class FavoriteService {
  private readonly domain = 'favorite';

  constructor(
    private readonly repository: FavoriteRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Add a deck to user's favorites.
   */
  async add(userId: string, deckId: string): Promise<FavoriteResponseDto> {
    // Check if already favorited
    const existing = await this.repository.findByUserAndDeck(userId, deckId);
    if (existing) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        ERROR_CODES.FAVORITE_ALREADY_EXISTS,
        'Deck is already in your favorites',
      );
    }

    const favorite = await this.repository.create(userId, deckId);

    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, userId),
    );

    this.eventEmitter.emit(FAVORITE_EVENTS.ADDED, {
      userId,
      deckId,
      favoriteId: favorite.id,
    });

    return plainToInstance(FavoriteResponseDto, favorite, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Remove a deck from user's favorites.
   */
  async remove(userId: string, deckId: string): Promise<void> {
    const existing = await this.repository.findByUserAndDeck(userId, deckId);
    if (!existing) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.FAVORITE_NOT_FOUND,
        'Favorite not found',
      );
    }

    await this.repository.delete(userId, deckId);

    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, userId),
    );

    this.eventEmitter.emit(FAVORITE_EVENTS.REMOVED, {
      userId,
      deckId,
    });
  }

  /**
   * Get user's favorite decks (paginated).
   */
  async findByUser(
    userId: string,
    query: PaginationRequestDto,
  ): Promise<{ data: FavoriteResponseDto[]; total: number }> {
    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      userId,
      query.page,
      query.limit,
    );
    const cached = await this.cacheManager.get<{
      data: FavoriteResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const result = await this.repository.findByUser(userId, skip, query.limit);

    const data = result.favorites.map((f) =>
      plainToInstance(FavoriteResponseDto, f, {
        excludeExtraneousValues: true,
      }),
    );

    const response = { data, total: result.total };
    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }

  /**
   * Check if a deck is favorited by user.
   */
  async isFavorited(userId: string, deckId: string): Promise<boolean> {
    const existing = await this.repository.findByUserAndDeck(userId, deckId);
    return !!existing;
  }

  /**
   * Get total favorite count for a user.
   */
  async countByUser(userId: string): Promise<number> {
    return this.repository.countByUser(userId);
  }
}
