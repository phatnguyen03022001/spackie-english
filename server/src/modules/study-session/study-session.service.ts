// src/modules/study-session/study-session.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudySessionRepository } from '@modules/study-session/study-session.repository';
import { StartSessionDto } from '@modules/study-session/dto/start-session.dto';
import { SessionResponseDto } from '@modules/study-session/dto/session-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { STUDY_SESSION_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class StudySessionService {
  private readonly domain = 'study:session';

  constructor(
    private readonly repository: StudySessionRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Start a study session. If one is already active, return the existing one.
   */
  async start(
    userId: string,
    _dto?: StartSessionDto,
  ): Promise<SessionResponseDto> {
    // Check for existing active session
    const existing = await this.repository.findActiveByUser(userId);
    if (existing) {
      return plainToInstance(SessionResponseDto, existing, {
        excludeExtraneousValues: true,
      });
    }

    const session = await this.repository.create(userId);

    // Cache active session in Redis
    await this.cacheManager.set(
      `${this.domain}:active:${userId}`,
      session,
      86400, // 24h TTL
    );

    this.eventEmitter.emit(STUDY_SESSION_EVENTS.STARTED, {
      userId,
      sessionId: session.id,
      startedAt: session.startedAt,
    });

    return plainToInstance(SessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * End the current active study session.
   */
  async end(userId: string): Promise<SessionResponseDto> {
    const active = await this.repository.findActiveByUser(userId);
    if (!active) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.STUDY_SESSION_NOT_FOUND,
        'No active study session found',
      );
    }

    const endedAt = new Date();
    const startedAt = new Date(active.startedAt as string);
    const totalDurationMs = endedAt.getTime() - startedAt.getTime();

    await this.repository.endSession(
      active.id as string,
      endedAt,
      totalDurationMs,
    );

    // Remove from cache
    await this.cacheManager.del(`${this.domain}:active:${userId}`);

    this.eventEmitter.emit(STUDY_SESSION_EVENTS.ENDED, {
      userId,
      sessionId: active.id,
      startedAt: active.startedAt,
      endedAt,
      totalDurationMs,
    });

    return plainToInstance(
      SessionResponseDto,
      {
        ...active,
        endedAt,
        totalDurationMs,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Get the current active session, if any.
   */
  async getCurrent(userId: string): Promise<SessionResponseDto | null> {
    // Try cache first
    const cached = await this.cacheManager.get<Record<string, unknown>>(
      `${this.domain}:active:${userId}`,
    );
    if (cached) {
      return plainToInstance(SessionResponseDto, cached, {
        excludeExtraneousValues: true,
      });
    }

    const session = await this.repository.findActiveByUser(userId);
    if (!session) return null;

    return plainToInstance(SessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Increment cards reviewed count for the active session.
   */
  async incrementCardsReviewed(userId: string, count = 1): Promise<void> {
    const active = await this.repository.findActiveByUser(userId);
    if (active) {
      await this.repository.incrementCardsReviewed(active.id as string, count);
    }
  }
}
