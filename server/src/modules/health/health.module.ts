import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from '@infrastructure/redis/redis.health';
import { PusherHealthIndicator } from '@infrastructure/pusher/pusher.health';
import { MailHealthIndicator } from '@infrastructure/mail/mail.health';
import { StorageHealthIndicator } from '@infrastructure/storage/storage.health';
import { PaymentHealthIndicator } from '@infrastructure/payment/payment.health';
import { DeepSeekHealthIndicator } from '@infrastructure/third-party/deepseek.health';
import { MapTilerHealthIndicator } from '@infrastructure/third-party/maptiler.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    PusherHealthIndicator,
    MailHealthIndicator,
    StorageHealthIndicator,
    PaymentHealthIndicator,
    DeepSeekHealthIndicator,
    MapTilerHealthIndicator,
  ],
})
export class HealthModule {}
