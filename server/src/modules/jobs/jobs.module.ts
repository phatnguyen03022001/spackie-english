// src/modules/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { JobsController } from '@modules/jobs/jobs.controller';
import { JobsService } from '@modules/jobs/jobs.service';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [RedisModule, LoggerModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsHistoryModule {}
