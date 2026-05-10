// src/modules/study/study.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StudyService } from '@modules/study/study.service';
import { DueCardsQueryDto } from '@modules/study/dto/due-cards-query.dto';
import { SubmitReviewDto } from '@modules/study/dto/submit-review.dto';
import { ReviewResultDto } from '@modules/study/dto/review-result.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
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
  async getDueCards(
    @CurrentUser('id') userId: string,
    @Query() query: DueCardsQueryDto,
  ): Promise<{ data: IDueCardItem[]; total: number }> {
    return this.studyService.getDueCards(userId, query);
  }

  @Post('review')
  @ApiOperation({ summary: 'Submit a card review rating' })
  async submitReview(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitReviewDto,
  ): Promise<ReviewResultDto> {
    return this.studyService.submitReview(userId, dto);
  }

  @Get('due-count')
  @ApiOperation({ summary: 'Get count of due cards' })
  async getDueCount(
    @CurrentUser('id') userId: string,
    @Query('deckId') deckId?: string,
  ): Promise<{ dueCount: number }> {
    return this.studyService.getDueCount(userId, deckId);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get user study streak' })
  async getStreak(@CurrentUser('id') userId: string): Promise<IStreakInfo> {
    return this.studyService.getStreak(userId);
  }
}
