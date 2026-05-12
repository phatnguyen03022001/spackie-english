// src/modules/audit-log/audit-log.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogRepository } from '@modules/audit-log/audit-log.repository';
import { AuditLogQueryDto } from '@modules/audit-log/dto/audit-log-query.dto';
import { AuditLogResponseDto } from '@modules/audit-log/dto/audit-log-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { AUDIT_LOG_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import {
  getPaginationOffset,
  parseSortQuery,
} from '@common/utils/pagination.util';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuditLogService {
  private readonly domain = 'audit-log';

  constructor(
    private readonly repository: AuditLogRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Create an audit log entry.
   */
  async create(data: {
    userId: string;
    action: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
  }): Promise<AuditLogResponseDto> {
    const log = await this.repository.create(data);

    this.eventEmitter.emit(AUDIT_LOG_EVENTS.CREATED, {
      id: log.id,
      ...data,
    });

    return plainToInstance(AuditLogResponseDto, log, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get paginated audit logs (admin only).
   */
  async findAll(
    query: AuditLogQueryDto,
  ): Promise<{ data: AuditLogResponseDto[]; total: number }> {
    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      'logs',
      query.page,
      query.limit,
      {
        ...(query.userId && { userId: query.userId }),
        ...(query.action && { action: query.action }),
      },
    );
    const cached = await this.cacheManager.get<{
      data: AuditLogResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const sort = parseSortQuery(query.sort);

    const result = await this.repository.findMany({
      skip,
      take: query.limit,
      userId: query.userId,
      action: query.action,
      startDate: query.startDate,
      endDate: query.endDate,
      sort,
    });

    const data = result.logs.map((l) =>
      plainToInstance(AuditLogResponseDto, l, {
        excludeExtraneousValues: true,
      }),
    );

    const response = { data, total: result.total };
    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }

  /**
   * Get audit log detail by ID.
   */
  async findById(id: string): Promise<AuditLogResponseDto> {
    const log = await this.repository.findById(id);
    if (!log) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.AUDIT_LOG_NOT_FOUND,
        'Audit log not found',
      );
    }

    return plainToInstance(AuditLogResponseDto, log, {
      excludeExtraneousValues: true,
    });
  }
}
