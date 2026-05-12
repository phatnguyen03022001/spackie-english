// src/modules/search/search.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SearchRepository } from '@modules/search/search.repository';
import { SearchMapper } from '@modules/search/mappers/search.mapper';
import { SearchQueryDto } from '@modules/search/dto/search-query.dto';
import { SearchSuggestDto } from '@modules/search/dto/search-suggest.dto';
import { SearchResponseDto } from '@modules/search/dto/search-response.dto';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { getPaginationOffset } from '@common/utils/pagination.util';

@Injectable()
export class SearchService {
  private readonly domain = 'search';

  constructor(
    private readonly repository: SearchRepository,
    private readonly mapper: SearchMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async globalSearch(
    userId: string,
    query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    const cacheKey = CacheKeyBuilder.search(
      this.domain,
      'global',
      query.q,
      query.page,
      query.limit,
    );
    const cached = await this.cacheManager.get<SearchResponseDto>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });

    const [deckResult, cardResult] = await Promise.all([
      this.repository.searchDecks(userId, query.q, skip, query.limit),
      this.repository.searchCards(userId, query.q, skip, query.limit),
    ]);

    const decks = this.mapper.toDeckSearchResultDtoList(
      deckResult.decks as any[],
    );
    const cards = this.mapper.toCardSearchResultDtoList(
      cardResult.cards as any[],
    );

    const result = new SearchResponseDto(
      decks,
      cards,
      deckResult.total,
      cardResult.total,
    );

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  }

  async searchDecks(
    userId: string,
    query: SearchQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = CacheKeyBuilder.search(
      this.domain,
      'decks',
      query.q,
      query.page,
      query.limit,
    );
    const cached = await this.cacheManager.get<{
      data: any[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const result = await this.repository.searchDecks(
      userId,
      query.q,
      skip,
      query.limit,
    );
    const data = this.mapper.toDeckSearchResultDtoList(result.decks as any[]);
    const response = { data, total: result.total };

    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }

  async searchCards(
    userId: string,
    query: SearchQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    const cacheKey = CacheKeyBuilder.search(
      this.domain,
      'cards',
      query.q,
      query.page,
      query.limit,
    );
    const cached = await this.cacheManager.get<{
      data: any[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const result = await this.repository.searchCards(
      userId,
      query.q,
      skip,
      query.limit,
    );
    const data = this.mapper.toCardSearchResultDtoList(result.cards as any[]);
    const response = { data, total: result.total };

    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }

  async getSuggestions(
    userId: string,
    query: SearchSuggestDto,
  ): Promise<string[]> {
    const cacheKey = `${this.domain}:suggest:${userId}:${query.q.toLowerCase().trim()}`;
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) return cached;

    const suggestions = await this.repository.getSuggestions(userId, query.q);
    await this.cacheManager.set(cacheKey, suggestions, CACHE_TTL.SHORT);
    return suggestions;
  }

  async invalidateSearchCache(): Promise<void> {
    await this.cacheManager.delPattern(`${this.domain}:*`);
  }
}
