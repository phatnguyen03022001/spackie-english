// src/modules/rate-limit/rate-limit.service.ts
import { Injectable, Inject, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@infrastructure/redis/redis.service';
import { PrismaService } from '@database/prisma.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import {
  RateLimitInfoDto,
  TierLimitsDto,
} from '@modules/rate-limit/dto/rate-limit-info.dto';

@Injectable()
export class RateLimitService {
  private readonly CACHE_TTL = 5; // 5 seconds cache

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(RateLimitService.name);
  }

  async getRateLimitInfo(userId: string): Promise<RateLimitInfoDto> {
    try {
      // Check cache first
      const cacheKey = `rate-limit:info:${userId}`;
      const cached = await this.cacheManager.get<RateLimitInfoDto>(cacheKey);
      if (cached) return cached;

      // Determine user tier
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new BusinessException(
          HttpStatus.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          'User not found',
        );
      }

      let tier: 'FREE' | 'VIP' | 'ADMIN' = 'FREE';
      if (user.role === 'ADMIN') {
        tier = 'ADMIN';
      } else if (
        user.subscription &&
        user.subscription.status === 'ACTIVE' &&
        user.subscription.expiresAt &&
        user.subscription.expiresAt > new Date()
      ) {
        tier = 'VIP';
      }

      // Get throttler config
      const throttlers =
        this.configService.get<
          Array<{ name: string; ttl: number; limit: number }>
        >('throttler') || [];
      const throttlerMap = new Map(throttlers.map((t) => [t.name, t]));

      // Get usage from Redis for each throttler
      const limits = {
        short: await this.getTierLimit('short', throttlerMap, userId),
        medium: await this.getTierLimit('medium', throttlerMap, userId),
        long: await this.getTierLimit('long', throttlerMap, userId),
      };

      const result: RateLimitInfoDto = { tier, limits };

      // Cache for 5 seconds
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch rate limit info: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ERROR_CODES.RATE_LIMIT_INFO_FETCH_FAILED,
        'Failed to fetch rate limit information',
      );
    }
  }

  private async getTierLimit(
    name: string,
    throttlerMap: Map<string, { name: string; ttl: number; limit: number }>,
    userId: string,
  ): Promise<TierLimitsDto> {
    const config = throttlerMap.get(name);
    if (!config) {
      return { limit: Infinity, ttl: 0, remaining: Infinity };
    }

    const { ttl, limit } = config;
    const storageKey = `throttler:${name}:${userId}`;
    const totalHits = await this.redisService.client.get(storageKey);
    const hits = totalHits ? parseInt(totalHits, 10) : 0;
    const remaining = Math.max(0, limit - hits);

    return { limit, ttl, remaining };
  }
}
