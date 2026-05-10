import { Module, Global } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis/redis.service';
import { RedisCacheManager } from '@infrastructure/redis/redis-cache-manager';
import { RedisLockService } from '@infrastructure/redis/redis-lock.service';
import { RedisHealthIndicator } from '@infrastructure/redis/redis.health';
import { RedisThrottlerStorage } from '@infrastructure/redis/redis-throttler.storage';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    RedisService,
    {
      provide: 'ICacheManager',
      useClass: RedisCacheManager,
    },
    RedisLockService,
    RedisHealthIndicator,
    RedisThrottlerStorage,
  ],
  exports: [
    'ICacheManager',
    RedisService,
    RedisLockService,
    RedisHealthIndicator,
    RedisThrottlerStorage,
  ],
})
export class RedisModule {}
