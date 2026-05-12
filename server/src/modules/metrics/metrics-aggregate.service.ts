// src/modules/metrics/metrics-aggregate.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { AggregateMetricsDto } from '@modules/metrics/dto/aggregate-metrics.dto';
import { RedisService } from '@infrastructure/redis/redis.service';

@Injectable()
export class MetricsAggregateService {
  private readonly CACHE_TTL = 60; // 1 minute cache

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MetricsAggregateService.name);
  }

  async getAggregateMetrics(): Promise<AggregateMetricsDto> {
    // Try cache first
    const cacheKey = 'metrics:aggregate';
    const cached = await this.cacheManager.get<AggregateMetricsDto>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run queries in parallel
    const [
      dailyActiveUsers,
      newDecksToday,
      newCardsToday,
      revenueResult,
      queueBacklog,
    ] = await Promise.all([
      // Daily active users: users who studied today
      this.prisma.userActivity.count({
        where: {
          createdAt: { gte: startOfDay },
          type: 'REVIEW_CARD',
        },
      }),
      // New decks today
      this.prisma.deck.count({
        where: {
          createdAt: { gte: startOfDay },
          deletedAt: null,
        },
      }),
      // New cards created via progress today
      this.prisma.cardProgress.count({
        where: {
          firstSeenAt: { gte: startOfDay },
        },
      }),
      // Revenue this month
      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Queue backlog from Redis
      this.getQueueBacklog(),
    ]);

    const totalRevenueThisMonth = revenueResult._sum.amount || 0;

    const result: AggregateMetricsDto = {
      dailyActiveUsers,
      newDecksToday,
      newCardsToday,
      totalRevenueThisMonth,
      averageApiResponseTimeMs: 0, // Would come from APM/Prometheus
      errorRatePercent: 0, // Would come from APM/Prometheus
      queueBacklog,
    };

    // Cache for 1 minute
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  private async getQueueBacklog(): Promise<number> {
    try {
      // Sum all waiting jobs across Bull queues
      const queueKeys = await this.redisService.client.keys('bull:*:wait*');
      let total = 0;
      for (const key of queueKeys) {
        const count = await this.redisService.client.llen(key);
        total += count;
      }
      return total;
    } catch {
      return 0;
    }
  }
}
