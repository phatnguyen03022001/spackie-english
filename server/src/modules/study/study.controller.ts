// src/modules/study/study.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { StudyService } from '@modules/study/study.service';
import { DueCardsQueryDto } from '@modules/study/dto/due-cards-query.dto';
import { SubmitReviewDto } from '@modules/study/dto/submit-review.dto';
import { ReviewResultDto } from '@modules/study/dto/review-result.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import type {
  IDueCardItem,
  IStreakInfo,
} from '@modules/study/interfaces/study.interface';

@ApiTags('Study')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study')
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Get('due')
  @ApiOperation({ summary: 'Get due cards for review' })
  @ApiResponse({
    status: 200,
    description: 'List of due cards with total count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDueCards(
    @CurrentUser('id') userId: string,
    @Query() query: DueCardsQueryDto,
  ): Promise<{ data: IDueCardItem[]; total: number }> {
    return this.studyService.getDueCards(userId, query);
  }

  @Post('review')
  @ApiOperation({ summary: 'Submit a card review rating' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Required idempotency key to prevent duplicate reviews',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Review submitted',
    type: ReviewResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'INVALID_RATING or MISSING_IDEMPOTENCY_KEY',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitReview(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitReviewDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<ReviewResultDto> {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency-Key header is required for review submission',
      );
    }
    return this.studyService.submitReview(userId, dto);
  }

  @Get('due-count')
  @ApiOperation({ summary: 'Get count of due cards' })
  @ApiQuery({
    name: 'deckId',
    required: false,
    description: 'Filter by deck ID',
  })
  @ApiResponse({ status: 200, description: 'Due cards count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDueCount(
    @CurrentUser('id') userId: string,
    @Query('deckId') deckId?: string,
  ): Promise<{ dueCount: number }> {
    return this.studyService.getDueCount(userId, deckId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get review history' })
  @ApiQuery({
    name: 'cardId',
    required: false,
    description: 'Filter by card ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Review history sorted by date desc',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('cardId') cardId?: string,
  ): Promise<SuccessResponseDto<unknown[]>> {
    const history = await this.studyService.getReviewHistory(userId, cardId);
    return new SuccessResponseDto(history);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get user study streak' })
  @ApiResponse({
    status: 200,
    description:
      'Study streak info (currentStreak, longestStreak, lastStudyDate)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStreak(@CurrentUser('id') userId: string): Promise<IStreakInfo> {
    return this.studyService.getStreak(userId);
  }
}
