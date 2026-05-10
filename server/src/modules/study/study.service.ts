// src/modules/study/study.service.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudyRepository } from '@modules/study/study.repository';
import { DueCardsQueryDto } from '@modules/study/dto/due-cards-query.dto';
import { SubmitReviewDto } from '@modules/study/dto/submit-review.dto';
import { ReviewResultDto } from '@modules/study/dto/review-result.dto';
import {
  calculateSM2,
  calculateStreak,
} from '@modules/study/utils/sm2-algorithm';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { STUDY_EVENTS } from '@common/constants/events.constants';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { PUSHER_EVENTS } from '@common/constants/events.constants';
import type {
  IDueCardItem,
  IStreakInfo,
} from '@modules/study/interfaces/study.interface';

@Injectable()
export class StudyService {
  constructor(
    private readonly repository: StudyRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly pusherService: PusherService,
  ) {}

  async getDueCards(
    userId: string,
    query: DueCardsQueryDto,
  ): Promise<{ data: IDueCardItem[]; total: number }> {
    const skip = (query.page - 1) * query.limit;
    const { items, total } = await this.repository.findDueCards(
      userId,
      skip,
      query.limit,
      query.deckId,
    );

    const data: IDueCardItem[] = items.map((item) => ({
      globalCardId: item.globalCardId,
      front: (item as any).globalCard?.front ?? '',
      back: (item as any).globalCard?.back,
      imageUrl: (item as any).globalCard?.imageUrl,
      audioUrl: (item as any).globalCard?.audioUrl,
      extras:
        ((item as any).globalCard?.extras as Record<string, unknown>) ?? {},
      progress: {
        easeFactor: item.easeFactor,
        interval: item.interval,
        repetitions: item.repetitions,
        dueDate: item.dueDate,
        lastRating: item.lastRating ?? undefined,
        reviewCount: item.reviewCount,
      },
    }));

    return { data, total };
  }

  async submitReview(
    userId: string,
    dto: SubmitReviewDto,
  ): Promise<ReviewResultDto> {
    // Get current progress
    const progress = await this.repository.findCardProgress(
      userId,
      dto.globalCardId,
    );

    if (!progress) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.STUDY_CARD_NOT_FOUND,
        'Card progress not found. Add this card to your study first.',
      );
    }

    // Calculate SM-2
    const sm2Result = calculateSM2(dto.rating, {
      easeFactor: progress.easeFactor,
      interval: progress.interval,
      repetitions: progress.repetitions,
    });

    // Update progress
    const recentReview = {
      rating: dto.rating,
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      reviewedAt: new Date().toISOString(),
      reviewDurationMs: dto.reviewDurationMs ?? 0,
    };

    await this.repository.upsertCardProgress(userId, dto.globalCardId, {
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      dueDate: sm2Result.dueDate,
      lastRating: dto.rating,
      reviewCount: progress.reviewCount + 1,
      recentReviews: [...progress.recentReviews, recentReview as any],
      lastReviewAt: new Date(),
    });

    // Update streak
    const streakInfo = await this.repository.getUserStreak(userId);
    const newStreak = calculateStreak(
      streakInfo.currentStreak,
      streakInfo.lastStudiedAt,
    );
    await this.repository.updateUserStreak(
      userId,
      newStreak.currentStreak,
      newStreak.longestStreak,
    );

    // Get remaining due count
    const dueCountRemaining = await this.repository.countDueCards(userId);

    // Emit internal event
    this.eventEmitter.emit(STUDY_EVENTS.CARD_REVIEWED, {
      userId,
      globalCardId: dto.globalCardId,
      rating: dto.rating,
      sm2Result,
    });

    // Send Pusher events
    await this.pusherService.triggerToUser(
      userId,
      PUSHER_EVENTS.STUDY_DUE_COUNT_UPDATED,
      {
        dueCount: dueCountRemaining,
        totalDue: dueCountRemaining,
      },
    );

    if (
      newStreak.currentStreak !== streakInfo.currentStreak ||
      newStreak.longestStreak !== streakInfo.longestStreak
    ) {
      await this.pusherService.triggerToUser(
        userId,
        PUSHER_EVENTS.STUDY_STREAK_UPDATED,
        {
          currentStreak: newStreak.currentStreak,
          longestStreak: newStreak.longestStreak,
        },
      );
    }

    return new ReviewResultDto({
      nextDueDate: sm2Result.dueDate,
      interval: sm2Result.interval,
      easeFactor: sm2Result.easeFactor,
      dueCountRemaining,
    });
  }

  async getDueCount(
    userId: string,
    deckId?: string,
  ): Promise<{ dueCount: number }> {
    const dueCount = await this.repository.countDueCards(userId, deckId);
    return { dueCount };
  }

  async getStreak(userId: string): Promise<IStreakInfo> {
    const streakInfo = await this.repository.getUserStreak(userId);
    return {
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
    };
  }
}
