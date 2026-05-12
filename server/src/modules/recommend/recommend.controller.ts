// src/modules/recommend/recommend.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RecommendService } from '@modules/recommend/recommend.service';
import { RecommendDecksDto } from '@modules/recommend/dto/recommend-decks.dto';
import { RecommendReviewDto } from '@modules/recommend/dto/recommend-review.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Recommend')
@ApiBearerAuth()
@Controller('recommend')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Get('decks')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Recommend public decks based on user interests' })
  @ApiResponse({
    status: 200,
    description: 'Recommended decks',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async recommendDecks(
    @CurrentUser() user: RequestUser,
    @Query() query: RecommendDecksDto,
  ): Promise<{ data: any[]; total: number }> {
    return this.recommendService.recommendDecks(
      user.id,
      query.page,
      query.limit,
    );
  }

  @Get('review')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Suggest next cards for review (due + weak)' })
  @ApiResponse({
    status: 200,
    description: 'Cards recommended for review',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async recommendReview(
    @CurrentUser() user: RequestUser,
    @Query() query: RecommendReviewDto,
  ): Promise<any[]> {
    return this.recommendService.recommendReview(user.id, query.limit);
  }

  @Get('weak-words')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'List cards user struggles with' })
  @ApiResponse({
    status: 200,
    description: 'Weak words list',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async recommendWeakWords(@CurrentUser() user: RequestUser): Promise<any[]> {
    return this.recommendService.recommendWeakWords(user.id);
  }
}
