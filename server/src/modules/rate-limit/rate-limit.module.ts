// src/modules/rate-limit/rate-limit.module.ts
import { Module } from '@nestjs/common';
import { RateLimitController } from '@modules/rate-limit/rate-limit.controller';
import { RateLimitService } from '@modules/rate-limit/rate-limit.service';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { LoggerModule } from '@common/logger/logger.module';
import { PrismaModule } from '@database/prisma.module';

@Module({
  imports: [RedisModule, LoggerModule, PrismaModule],
  controllers: [RateLimitController],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
