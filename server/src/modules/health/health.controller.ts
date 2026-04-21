import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@infrastructure/redis/redis.health';
import { PusherHealthIndicator } from '@infrastructure/pusher/pusher.health';
import { MailHealthIndicator } from '@infrastructure/mail/mail.health';
import { StorageHealthIndicator } from '@infrastructure/storage/storage.health';
import { PaymentHealthIndicator } from '@infrastructure/payment/payment.health';
import { DeepSeekHealthIndicator } from '@infrastructure/third-party/deepseek.health';
import { MapTilerHealthIndicator } from '@infrastructure/third-party/maptiler.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redis: RedisHealthIndicator,
    private pusher: PusherHealthIndicator,
    private mail: MailHealthIndicator,
    private storage: StorageHealthIndicator,
    private payment: PaymentHealthIndicator,
    private deepseek: DeepSeekHealthIndicator,
    private maptiler: MapTilerHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.pusher.isHealthy('pusher'),
      () => this.mail.isHealthy('mail'),
      () => this.storage.isHealthy('storage'),
      () => this.payment.isHealthy('payment'),
      () => this.deepseek.isHealthy('deepseek'),
      () => this.maptiler.isHealthy('maptiler'),
    ]);
  }
}
