import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisCacheManager } from './redis-cache-manager';
import { RedisLockService } from './redis-lock.service';
import { RedisHealthIndicator } from './redis.health';
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
  ],
  exports: [
    'ICacheManager',
    RedisService,
    RedisLockService,
    RedisHealthIndicator,
  ],
})
export class RedisModule {}
