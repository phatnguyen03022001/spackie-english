import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { randomBytes } from 'crypto';

@Injectable()
export class RedisLockService {
  constructor(private readonly redisService: RedisService) {}

  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const token = randomBytes(16).toString('hex');
    const result = await this.redisService.client.set(
      `lock:${key}`,
      token,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redisService.client.eval(
      script,
      1,
      `lock:${key}`,
      token,
    );
    return result === 1;
  }

  async withLock<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const token = await this.acquireLock(key, ttlSeconds);
    if (!token) throw new Error('Could not acquire lock');
    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }
}
