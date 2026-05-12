import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bull';
import { HealthController } from '@modules/health/health.controller';
import { HealthAdminController } from '@modules/health/health-admin.controller';
import { RedisHealthIndicator } from '@infrastructure/redis/redis.health';
import { PusherHealthIndicator } from '@infrastructure/pusher/pusher.health';
import { MailHealthIndicator } from '@infrastructure/mail/mail.health';
import { StorageHealthIndicator } from '@infrastructure/storage/storage.health';
import { PaymentHealthIndicator } from '@infrastructure/payment/payment.health';
import { DeepSeekHealthIndicator } from '@infrastructure/third-party/deepseek.health';
import { PixabayHealthIndicator } from '@infrastructure/third-party/pixabay.health';
import { MapTilerHealthIndicator } from '@infrastructure/third-party/maptiler.health';
import { QueueHealthIndicator } from '@infrastructure/queue/queue.health';
import { PrismaHealthIndicator } from '@database/prisma.health';
import { HealthDependenciesService } from '@modules/health/health-dependencies.service';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { PusherModule } from '@infrastructure/pusher/pusher.module';
import { MailModule } from '@infrastructure/mail/mail.module';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { PaymentModule } from '@infrastructure/payment/payment.module';
import { ThirdPartyModule } from '@infrastructure/third-party/third-party.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [
    TerminusModule,
    RedisModule,
    PusherModule,
    MailModule,
    StorageModule,
    PaymentModule,
    ThirdPartyModule,
    LoggerModule,
    // Register queues needed by QueueHealthIndicator
    BullModule.registerQueue(
      { name: 'media-enrichment' },
      { name: 'ai-enrichment' },
      { name: 'payment-webhook' },
    ),
  ],
  controllers: [HealthController, HealthAdminController],
  providers: [
    RedisHealthIndicator,
    PusherHealthIndicator,
    MailHealthIndicator,
    StorageHealthIndicator,
    PaymentHealthIndicator,
    DeepSeekHealthIndicator,
    PixabayHealthIndicator,
    MapTilerHealthIndicator,
    QueueHealthIndicator,
    PrismaHealthIndicator,
    HealthDependenciesService,
  ],
})
export class HealthModule {}
