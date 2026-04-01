import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewService } from '../services/review.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  SyncSessionDto,
  CreateSessionDto,
  DeckResponseDto,
  PaginatedDecksDto,
  EnrollResultDto,
  SuccessDto,
  DueCountDto,
  StartSessionDto,
  SyncResultDto,
  LearningSessionDto,
  UserStatsResponseDto,
  ForecastDto,
  HeatmapDto,
} from '../dto/vocab.dto';
import { DifficultyLevel } from '@prisma/client';
import { ObjectIdParam } from '@common/decorators/object-id-param.decorator';

@Controller('vocab')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('decks/public')
  async getPublicDecks(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('tag') tag?: DifficultyLevel,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedDecksDto> {
    return this.reviewService.findPublicDecks(userId, search, tag, page, limit);
  }

  @Get('decks/:id/preview')
  async getDeckPreview(
    @CurrentUser('id') userId: string,
    @ObjectIdParam() deckId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ): Promise<DeckResponseDto | null> {
    return this.reviewService.getDeckWithCards(deckId, userId, limit, page);
  }

  @Post('decks/:id/enroll')
  async enrollDeck(
    @ObjectIdParam() deckId: string,
    @CurrentUser('id') userId: string,
  ): Promise<EnrollResultDto> {
    return this.reviewService.enrollDeck(userId, deckId);
  }

  @Delete('decks/:id/unenroll')
  async unenrollDeck(
    @ObjectIdParam() deckId: string,
    @CurrentUser('id') userId: string,
  ): Promise<SuccessDto> {
    return this.reviewService.unenrollDeck(userId, deckId);
  }

  @Get('decks/enrolled')
  async getMyEnrolledDecks(
    @CurrentUser('id') userId: string,
  ): Promise<DeckResponseDto[]> {
    return this.reviewService.getEnrolledDecks(userId);
  }

  @Get('reviews/today-count')
  async getDueCount(@CurrentUser('id') userId: string): Promise<DueCountDto> {
    return this.reviewService.getDueCount(userId);
  }

  @Post('reviews/session/start')
  async startSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ): Promise<StartSessionDto> {
    const mode = dto.mode || 'default';
    const limit = dto.limit ?? 50;
    const page = dto.page ?? 1;
    return this.reviewService.createLearningSession(
      userId,
      dto.deckId,
      mode,
      limit,
      page,
    );
  }

  @Post('reviews/session/sync')
  async syncSessionResults(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncSessionDto,
  ): Promise<SyncResultDto> {
    return this.reviewService.syncSessionProgress(userId, dto);
  }

  @Patch('reviews/session/:id/cancel')
  async cancelSession(
    @ObjectIdParam('id') sessionId: string,
    @CurrentUser('id') userId: string,
  ): Promise<LearningSessionDto> {
    return this.reviewService.cancelSession(userId, sessionId);
  }

  @Get('dashboard/stats')
  async getQuantitativeStats(
    @CurrentUser('id') userId: string,
  ): Promise<UserStatsResponseDto | null> {
    return this.reviewService.getUserStats(userId);
  }

  @Get('reviews/forecast')
  async getReviewForecast(
    @CurrentUser('id') userId: string,
  ): Promise<ForecastDto> {
    return this.reviewService.getReviewForecast(userId);
  }

  @Get('dashboard/heatmap')
  async getLearningHeatmap(
    @CurrentUser('id') userId: string,
  ): Promise<HeatmapDto> {
    return this.reviewService.getHeatmap(userId);
  }
}
