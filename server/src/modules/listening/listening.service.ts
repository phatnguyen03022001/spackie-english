// src/modules/listening/listening.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListeningRepository } from '@modules/listening/listening.repository';
import { StartListeningDto } from '@modules/listening/dto/start-listening.dto';
import { SubmitListeningDto } from '@modules/listening/dto/submit-listening.dto';
import { ListeningResultDto } from '@modules/listening/dto/listening-result.dto';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { LISTENING_EVENTS } from '@common/constants/events.constants';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';

@Injectable()
export class ListeningService {
  constructor(
    private readonly listeningRepository: ListeningRepository,
    private readonly pusherService: PusherService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  async startExercise(userId: string, dto: StartListeningDto) {
    const practice = await this.listeningRepository.createPractice({
      userId,
      globalCardId: dto.globalCardId,
      type: dto.type,
      score: 0,
      duration: 0,
      youtubeId: dto.youtubeUrl ? this.extractYoutubeId(dto.youtubeUrl) : null,
    });

    return practice;
  }

  async submitExercise(
    userId: string,
    exerciseId: string,
    dto: SubmitListeningDto,
  ): Promise<ListeningResultDto> {
    const practice =
      await this.listeningRepository.findPracticeById(exerciseId);
    if (!practice || practice.userId !== userId) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.LISTENING_EXERCISE_NOT_FOUND,
        'Listening practice not found',
      );
    }

    // Validate score, accuracy, fluency from client
    const { score, accuracy, fluency, duration, transcriptText } = dto;
    if (score < 0 || score > 100) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.LISTENING_INVALID_SCORE,
        'Score must be between 0 and 100',
      );
    }
    if (accuracy < 0 || accuracy > 100) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.LISTENING_INVALID_ACCURACY,
        'Accuracy must be between 0 and 100',
      );
    }
    if (fluency < 0 || fluency > 100) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.LISTENING_INVALID_FLUENCY,
        'Fluency must be between 0 and 100',
      );
    }
    if (duration <= 0) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.LISTENING_INVALID_DURATION,
        'Duration must be greater than 0',
      );
    }

    await this.listeningRepository.updatePractice(exerciseId, {
      score,
      accuracy,
      fluency,
      duration,
      result: {
        transcript: transcriptText || '',
        submittedAt: new Date(),
      },
    });

    // Invalidate cache for this user
    await this.cacheManager.delPattern(`listening:history:${userId}:*`);
    await this.cacheManager.delPattern(`listening:stats:${userId}:*`);

    // Emit event for statistics
    this.eventEmitter.emit(LISTENING_EVENTS.COMPLETED, {
      userId,
      practiceId: exerciseId,
      globalCardId: practice.globalCardId,
      type: practice.type,
      score,
      accuracy,
      fluency,
      duration,
    });

    // Send realtime notification via Pusher
    await this.pusherService.triggerToUser(userId, 'listening.completed', {
      globalCardId: practice.globalCardId,
      type: practice.type,
      score,
      accuracy,
      fluency,
      duration,
    });

    return new ListeningResultDto({ score, accuracy, fluency, duration });
  }

  async getHistory(userId: string, page: number, limit: number) {
    const cacheKey = CacheKeyBuilder.list('listening', 'history', page, limit, {
      userId,
    });
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const result = await this.listeningRepository.findHistoryByUser(
      userId,
      skip,
      limit,
    );
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  }

  async getStats(userId: string) {
    const cacheKey = CacheKeyBuilder.userResource('listening', 'stats', userId);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.listeningRepository.getUserStats(userId);
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  async getCardStats(
    userId: string,
    cardId: string,
  ): Promise<{ attempts: number; averageScore: number; bestScore: number }> {
    const cacheKey = CacheKeyBuilder.userResource(
      'listening',
      'stats',
      userId,
      cardId,
    );
    const cached = await this.cacheManager.get<{
      attempts: number;
      averageScore: number;
      bestScore: number;
    }>(cacheKey);
    if (cached) return cached;

    const result = await this.listeningRepository.getCardStats(userId, cardId);
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  private extractYoutubeId(url: string): string | null {
    // Support various YouTube URL formats:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://www.youtube.com/embed/VIDEO_ID
    // - https://www.youtube.com/shorts/VIDEO_ID
    // - https://m.youtube.com/watch?v=VIDEO_ID
    // - https://youtube.com/watch?v=VIDEO_ID
    const patterns = [
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}
