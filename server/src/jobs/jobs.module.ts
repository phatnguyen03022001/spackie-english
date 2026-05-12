// src/jobs/jobs.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '@database/prisma.module';
import { LoggerModule } from '@common/logger/logger.module';
import { PusherModule } from '@infrastructure/pusher/pusher.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { MailModule } from '@infrastructure/mail/mail.module';
import { CleanupScheduler } from './schedulers/cleanup.scheduler';
import { SubscriptionExpiryScheduler } from './schedulers/subscription-expiry.scheduler';
import { ReminderScheduler } from './schedulers/reminder.scheduler';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    LoggerModule,
    PusherModule,
    RedisModule,
    MailModule,
    BullModule.registerQueue({
      name: 'notification',
    }),
  ],
  providers: [
    CleanupScheduler,
    SubscriptionExpiryScheduler,
    ReminderScheduler,
    NotificationProcessor,
  ],
  exports: [CleanupScheduler, SubscriptionExpiryScheduler, ReminderScheduler],
})
export class JobsModule {}
