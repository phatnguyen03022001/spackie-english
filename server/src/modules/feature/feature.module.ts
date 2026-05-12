// src/modules/feature/feature.module.ts
import { Module } from '@nestjs/common';
import { FeatureController } from '@modules/feature/feature.controller';
import { FeatureService } from '@modules/feature/feature.service';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [RedisModule, LoggerModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
