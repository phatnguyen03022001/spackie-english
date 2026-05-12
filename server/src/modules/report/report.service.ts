// src/modules/report/report.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportRepository } from '@modules/report/report.repository';
import { CreateReportDto } from '@modules/report/dto/create-report.dto';
import { ReportQueryDto } from '@modules/report/dto/report-query.dto';
import { ResolveReportDto } from '@modules/report/dto/resolve-report.dto';
import { ReportResponseDto } from '@modules/report/dto/report-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { REPORT_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { getPaginationOffset } from '@common/utils/pagination.util';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ReportService {
  private readonly domain = 'report';

  constructor(
    private readonly repository: ReportRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Create a new report (authenticated user).
   */
  async create(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    const report = await this.repository.create({
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      description: dto.description,
    });

    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, 'admin'),
    );

    this.eventEmitter.emit(REPORT_EVENTS.CREATED, {
      reportId: report.id,
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
    });

    return plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get paginated reports (admin only).
   */
  async findAll(
    query: ReportQueryDto,
  ): Promise<{ data: ReportResponseDto[]; total: number }> {
    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      'admin',
      query.page,
      query.limit,
      {
        ...(query.status && { status: query.status }),
        ...(query.targetType && { targetType: query.targetType }),
      },
    );
    const cached = await this.cacheManager.get<{
      data: ReportResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const result = await this.repository.findMany({
      skip,
      take: query.limit,
      status: query.status,
      targetType: query.targetType,
    });

    const data = result.reports.map((r) =>
      plainToInstance(ReportResponseDto, r, {
        excludeExtraneousValues: true,
      }),
    );

    const response = { data, total: result.total };
    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }

  /**
   * Get report detail by ID (admin only).
   */
  async findById(id: string): Promise<ReportResponseDto> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.REPORT_NOT_FOUND,
        'Report not found',
      );
    }
    return plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Resolve or reject a report (admin only).
   */
  async resolve(
    id: string,
    resolvedBy: string,
    dto: ResolveReportDto,
  ): Promise<ReportResponseDto> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.REPORT_NOT_FOUND,
        'Report not found',
      );
    }

    if (report.status !== 'PENDING') {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        ERROR_CODES.REPORT_ALREADY_RESOLVED,
        `Report is already ${report.status}`,
      );
    }

    await this.repository.resolve(id, dto.status, resolvedBy);

    // Invalidate cache
    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, 'admin'),
    );

    const event =
      dto.status === 'RESOLVED'
        ? REPORT_EVENTS.RESOLVED
        : REPORT_EVENTS.REJECTED;
    this.eventEmitter.emit(event, {
      reportId: id,
      resolvedBy,
      note: dto.note,
    });

    return this.findById(id);
  }
}
