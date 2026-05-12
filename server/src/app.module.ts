// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ThrottlerModule,
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';

// Config imports (giữ nguyên)
import { validationSchema } from '@config/validation.schema';
import appConfig from '@config/app.config';
import authConfig from '@config/auth.config';
import databaseConfig from '@config/database.config';
import redisConfig from '@config/redis.config';
import storageConfig from '@config/storage.config';
import mailConfig from '@config/mail.config';
import loggerConfig from '@config/logger.config';
import cacheConfig from '@config/cache.config';
import throttlerConfig from '@config/throttler.config';
import pusherConfig from '@config/pusher.config';
import payosConfig from '@config/payos.config';
import queueConfig from '@config/queue.config';
import mapConfig from '@config/map.config';
import aiConfig from '@config/ai.config';
import otpConfig from '@config/otp.config';
import pixabayConfig from '@config/pixabay.config';

import { CommonModule } from '@common/common.module';

import { RedisModule } from '@infrastructure/redis/redis.module';
import { RedisThrottlerStorage } from '@infrastructure/redis/redis-throttler.storage';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { MailModule } from '@infrastructure/mail/mail.module';
import { PaymentModule } from '@infrastructure/payment/payment.module';
import { PusherModule } from '@infrastructure/pusher/pusher.module';
import { ThirdPartyModule } from '@infrastructure/third-party/third-party.module';
import { PrismaModule } from '@database/prisma.module';
import { HealthModule } from '@modules/health/health.module';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { FileManagerModule } from '@modules/file-manager/file-manager.module';
import { DecksModule } from '@modules/decks/decks.module';
import { CardsModule } from '@modules/cards/cards.module';
import { StudyModule } from '@modules/study/study.module';
import { ListeningModule } from '@modules/listening/listening.module';
import { StatisticsModule } from '@modules/statistics/statistics.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PaymentModule as BusinessPaymentModule } from '@modules/payment/payment.module';
import { JobsModule } from '@jobs/jobs.module';

// New P0 modules
import { SearchModule } from '@modules/search/search.module';
import { StudySessionModule } from '@modules/study-session/study-session.module';
import { AiModule } from '@modules/ai/ai.module';
import { RecommendModule } from '@modules/recommend/recommend.module';

// New P1 modules
import { SessionModule } from '@modules/session/session.module';
import { QueueMonitorModule } from '@modules/queue-monitor/queue-monitor.module';
import { FeatureModule } from '@modules/feature/feature.module';
import { PublicModule } from '@modules/public/public.module';

// New P2 modules (production startup)
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { ReportModule } from '@modules/report/report.module';
import { FavoriteModule } from '@modules/favorite/favorite.module';
import { ActivityModule } from '@modules/activity/activity.module';
import { MetricsModule } from '@modules/metrics/metrics.module';
import { AppInfoModule } from '@modules/app-info/app-info.module';
import { BulkModule } from '@modules/bulk/bulk.module';

// New P0 production modules
import { RateLimitModule } from '@modules/rate-limit/rate-limit.module';
import { PusherAuthModule } from '@modules/pusher-auth/pusher-auth.module';
import { JobsHistoryModule } from '@modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        redisConfig,
        storageConfig,
        mailConfig,
        loggerConfig,
        cacheConfig,
        throttlerConfig,
        pusherConfig,
        payosConfig,
        queueConfig,
        mapConfig,
        aiConfig,
        otpConfig,
        pixabayConfig,
      ],
      validationSchema,
      validationOptions: { abortEarly: false },
      cache: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    // Bull queue configuration (Redis-based job queues)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.url');
        if (!redisUrl) {
          throw new Error(
            'REDIS_URL is not defined. Bull queues require Redis.',
          );
        }
        return {
          redis: {
            host: new URL(redisUrl).hostname,
            port: parseInt(new URL(redisUrl).port || '6379', 10),
            username: new URL(redisUrl).username || undefined,
            password: new URL(redisUrl).password || undefined,
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            commandTimeout: 3000,
            enableReadyCheck: false,
            retryStrategy: (times: number) => {
              if (times > 3) return null;
              return Math.min(times * 200, 2000);
            },
          },
          prefix: configService.get<string>('queue.prefix') || 'bull',
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        };
      },
    }),
    CommonModule,
    // Luôn import ThrottlerModule
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        configService: ConfigService,
        storage: RedisThrottlerStorage,
      ): ThrottlerModuleOptions => {
        const throttlers = configService.get<ThrottlerOptions[]>('throttler');
        if (!throttlers || !Array.isArray(throttlers)) {
          throw new Error('Invalid throttler configuration');
        }
        return {
          throttlers,
          storage,
        };
      },
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    MailModule,
    PaymentModule,
    PusherModule,
    ThirdPartyModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    FileManagerModule,
    DecksModule,
    CardsModule,
    StudyModule,
    ListeningModule,
    StatisticsModule,
    NotificationModule,
    BusinessPaymentModule,
    JobsModule,
    // New P0 modules
    SearchModule,
    StudySessionModule,
    AiModule,
    RecommendModule,
    // New P1 modules
    SessionModule,
    QueueMonitorModule,
    FeatureModule,
    PublicModule,
    // New P2 modules (production startup)
    AuditLogModule,
    ReportModule,
    FavoriteModule,
    ActivityModule,
    MetricsModule,
    AppInfoModule,
    BulkModule,
    // New production modules
    RateLimitModule,
    PusherAuthModule,
    JobsHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
