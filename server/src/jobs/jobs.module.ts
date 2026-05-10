// src/jobs/jobs.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@database/prisma.module';
import { CleanupScheduler } from './schedulers/cleanup.scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [CleanupScheduler],
  exports: [CleanupScheduler],
})
export class JobsModule {}
