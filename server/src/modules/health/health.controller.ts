import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
import { Public } from '@common/decorators';
import { SkipTransform } from '@common/decorators/skip-transform.decorator';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redis: RedisHealthIndicator,
    private pusher: PusherHealthIndicator,
    private mail: MailHealthIndicator,
    private storage: StorageHealthIndicator,
    private payment: PaymentHealthIndicator,
    private deepseek: DeepSeekHealthIndicator,
    private pixabay: PixabayHealthIndicator,
    private maptiler: MapTilerHealthIndicator,
    private queue: QueueHealthIndicator,
    private prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  @SkipTransform()
  @ApiOperation({ summary: 'Check system health status of all services' })
  @ApiResponse({ status: 200, description: 'All systems operational' })
  @ApiResponse({ status: 503, description: 'One or more services are down' })
  check() {
    return this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.pusher.isHealthy('pusher'),
      () => this.mail.isHealthy('mail'),
      () => this.storage.isHealthy('storage'),
      () => this.payment.isHealthy('payment'),
      () => this.deepseek.isHealthy('deepseek'),
      () => this.pixabay.isHealthy('pixabay'),
      () => this.maptiler.isHealthy('maptiler'),
      () => this.queue.isHealthy('queue'),
      () => this.prisma.isHealthy('database'),
    ]);
  }

  @Get('live')
  @Public()
  @SkipTransform()
  @ApiOperation({
    summary: 'Liveness probe – always returns 200 if app is running',
  })
  @ApiResponse({ status: 200, description: 'App is alive' })
  @HttpCode(HttpStatus.OK)
  getLiveness(): { status: string; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @SkipTransform()
  @ApiOperation({
    summary: 'Readiness probe – checks dependencies (DB, Redis, Queue)',
  })
  @ApiResponse({ status: 200, description: 'App is ready' })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies unavailable',
  })
  @HealthCheck()
  getReadiness() {
    return this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.prisma.isHealthy('database'),
      () => this.queue.isHealthy('queue'),
    ]);
  }
}
