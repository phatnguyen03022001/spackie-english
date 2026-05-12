// src/modules/jobs/jobs.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis/redis.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import {
  JobHistoryQueryDto,
  JobHistoryItemDto,
  JobMetadata,
} from '@modules/jobs/dto/job-history-query.dto';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';

@Injectable()
export class JobsService {
  private readonly USER_JOBS_PREFIX = 'user:jobs:';
  private readonly JOB_PREFIX = 'job:';
  private readonly JOBS_TTL = 7 * 24 * 3600; // 7 days

  constructor(
    private readonly redisService: RedisService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(JobsService.name);
  }

  /**
   * Add a job ID to the user's job index set and store job metadata
   */
  async trackJob(
    userId: string,
    jobId: string,
    metadata: Omit<JobMetadata, 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const userJobsKey = `${this.USER_JOBS_PREFIX}${userId}`;
    const jobKey = `${this.JOB_PREFIX}${jobId}`;

    const now = new Date().toISOString();
    const jobData: JobMetadata = {
      ...metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Use Redis pipeline for atomicity
    const pipeline = this.redisService.client.pipeline();
    pipeline.sadd(userJobsKey, jobId);
    pipeline.expire(userJobsKey, this.JOBS_TTL);
    pipeline.set(jobKey, JSON.stringify(jobData));
    pipeline.expire(jobKey, this.JOBS_TTL);
    await pipeline.exec();
  }

  /**
   * Update job metadata (e.g., when status changes)
   */
  async updateJob(jobId: string, updates: Partial<JobMetadata>): Promise<void> {
    const jobKey = `${this.JOB_PREFIX}${jobId}`;
    const existing = await this.redisService.client.get(jobKey);
    if (!existing) return;

    const jobData: JobMetadata = {
      ...JSON.parse(existing),
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.client.setex(
      jobKey,
      this.JOBS_TTL,
      JSON.stringify(jobData),
    );
  }

  async getUserJobs(
    userId: string,
    query: JobHistoryQueryDto,
  ): Promise<{ data: JobHistoryItemDto[]; total: number }> {
    const userJobsKey = `${this.USER_JOBS_PREFIX}${userId}`;

    // Get all job IDs for this user
    const jobIds = await this.redisService.client.smembers(userJobsKey);

    if (!jobIds || jobIds.length === 0) {
      return { data: [], total: 0 };
    }

    // Fetch metadata for all jobs
    const jobs: JobMetadata[] = [];
    for (const jobId of jobIds) {
      const jobKey = `${this.JOB_PREFIX}${jobId}`;
      const jobData = await this.redisService.client.get(jobKey);
      if (jobData) {
        try {
          jobs.push(JSON.parse(jobData));
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Filter by status if specified
    let filtered = jobs;
    if (query.status) {
      filtered = jobs.filter((job) => job.status === query.status);
    }

    // Sort by createdAt descending
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Paginate
    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const data: JobHistoryItemDto[] = paginated.map((job) => ({
      jobId: job.jobId,
      cardId: job.cardId,
      front: job.front,
      status: job.status,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
      error: job.error,
    }));

    return { data, total: filtered.length };
  }
}
