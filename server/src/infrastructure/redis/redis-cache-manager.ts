import { Injectable } from '@nestjs/common';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { RedisService } from './redis.service';

// Prefix for all cache keys to allow safe namespace deletion
const CACHE_KEY_PREFIX = 'cache:';

@Injectable()
export class RedisCacheManager implements ICacheManager {
  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisService.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redisService.client.setex(key, ttl, serialized);
    } else {
      await this.redisService.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisService.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redisService.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length) {
        await this.redisService.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  /**
   * Reset the entire cache by deleting all keys under the cache namespace.
   * In production, this only deletes keys with the 'cache:' prefix.
   * For test environments, it can flush the whole database if explicitly allowed.
   */
  async reset(): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';

    if (isProduction) {
      // Safe: delete only keys with the cache prefix
      await this.delPattern(`${CACHE_KEY_PREFIX}*`);
    } else if (isTest) {
      // In test, we may allow full flush for isolation
      await this.redisService.client.flushall();
    } else {
      // Development: delete only cache-prefixed keys (safer than flushall)
      await this.delPattern(`${CACHE_KEY_PREFIX}*`);
    }
  }

  async ping(): Promise<string> {
    return this.redisService.ping();
  }
}
