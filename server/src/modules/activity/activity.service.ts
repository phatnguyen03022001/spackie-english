// src/modules/activity/activity.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityRepository } from '@modules/activity/activity.repository';
import { ActivityQueryDto } from '@modules/activity/dto/activity-query.dto';
import { ActivityResponseDto } from '@modules/activity/dto/activity-response.dto';
import { ACTIVITY_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { getPaginationOffset } from '@common/utils/pagination.util';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActivityService {
  private readonly domain = 'activity';

  constructor(
    private readonly repository: ActivityRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Record a user activity.
   */
  async record(data: {
    userId: string;
    type: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
  }): Promise<ActivityResponseDto> {
    const activity = await this.repository.create(data);

    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, data.userId),
    );

    this.eventEmitter.emit(ACTIVITY_EVENTS.CREATED, {
      id: activity.id,
      ...data,
    });

    return plainToInstance(ActivityResponseDto, activity, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get activities for a specific user (paginated).
   */
  async findByUser(
    userId: string,
    query: ActivityQueryDto,
  ): Promise<{ data: ActivityResponseDto[]; total: number }> {
    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      userId,
      query.page,
      query.limit,
      { ...(query.type && { type: query.type }) },
    );
    const cached = await this.cacheManager.get<{
      data: ActivityResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const result = await this.repository.findByUser(
      userId,
      skip,
      query.limit,
      query.type,
    );

    const data = result.activities.map((a) =>
      plainToInstance(ActivityResponseDto, a, {
        excludeExtraneousValues: true,
      }),
    );

    const response = { data, total: result.total };
    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }
}
