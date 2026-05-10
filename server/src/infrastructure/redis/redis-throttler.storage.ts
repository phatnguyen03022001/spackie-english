import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '@infrastructure/redis/redis.service';

// Định nghĩa kiểu trả về cho increment (dựa theo cấu trúc mong đợi của ThrottlerGuard)
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `throttler:${throttlerName}:${key}`;
    const multi = this.redisService.client.multi();
    multi.incr(storageKey);
    multi.ttl(storageKey);
    const results = await multi.exec();

    const totalHits = (results?.[0]?.[1] as number) ?? 1;
    let timeToExpire = (results?.[1]?.[1] as number) ?? ttl;

    if (totalHits === 1) {
      await this.redisService.client.expire(storageKey, ttl);
      timeToExpire = ttl;
    }

    let isBlocked = false;
    let timeToBlockExpire = 0;
    if (totalHits > limit) {
      isBlocked = true;
      const blockKey = `${storageKey}:block`;
      const blockTtl = await this.redisService.client.ttl(blockKey);
      if (blockTtl < 0) {
        await this.redisService.client.setex(blockKey, blockDuration, '1');
        timeToBlockExpire = blockDuration;
      } else {
        timeToBlockExpire = blockTtl;
      }
    }

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : ttl,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
