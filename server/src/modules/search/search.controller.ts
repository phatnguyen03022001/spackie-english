// src/modules/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from '@modules/search/search.service';
import { SearchQueryDto } from '@modules/search/dto/search-query.dto';
import { SearchSuggestDto } from '@modules/search/dto/search-suggest.dto';
import { SearchResponseDto } from '@modules/search/dto/search-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Global search across decks and cards' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async globalSearch(
    @CurrentUser() user: RequestUser,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.globalSearch(user.id, query);
  }

  @Get('decks')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Search only decks' })
  @ApiResponse({
    status: 200,
    description: 'Deck search results',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchDecks(
    @CurrentUser() user: RequestUser,
    @Query() query: SearchQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    return this.searchService.searchDecks(user.id, query);
  }

  @Get('cards')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Search only cards' })
  @ApiResponse({
    status: 200,
    description: 'Card search results',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchCards(
    @CurrentUser() user: RequestUser,
    @Query() query: SearchQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    return this.searchService.searchCards(user.id, query);
  }

  @Get('suggest')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Typeahead suggestions (min 2 chars)' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (min 2 chars)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of suggestion strings',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSuggestions(
    @CurrentUser() user: RequestUser,
    @Query() query: SearchSuggestDto,
  ): Promise<string[]> {
    return this.searchService.getSuggestions(user.id, query);
  }
}
