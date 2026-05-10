// src/config/config.module
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from '@config/validation.schema';

// Import tất cả config factories
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
import ttsConfig from '@config/tts.config';

// Import typed services
import { AppConfigService } from '@config/services/app-config.service';
import { AuthConfigService } from '@config/services/auth-config.service';
import { DatabaseConfigService } from '@config/services/database-config.service';
import { RedisConfigService } from '@config/services/redis-config.service';
import { StorageConfigService } from '@config/services/storage-config.service';
import { MailConfigService } from '@config/services/mail-config.service';
import { LoggerConfigService } from '@config/services/logger-config.service';
import { CacheConfigService } from '@config/services/cache-config.service';
import { ThrottlerConfigService } from '@config/services/throttler-config.service';
import { PusherConfigService } from '@config/services/pusher-config.service';
import { PayOSConfigService } from '@config/services/payos-config.service';
import { QueueConfigService } from '@config/services/queue-config.service';
import { MapConfigService } from '@config/services/map-config.service';
import { AIConfigService } from '@config/services/ai-config.service';
import { OTPConfigService } from '@config/services/otp-config.service';
import { PixabayConfigService } from '@config/services/pixabay-config.service';
import { TTSConfigService } from '@config/services/tts-config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // vẫn để true nhưng module này đã global, không bắt buộc
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
        ttsConfig,
      ],
      validationSchema,
      validationOptions: { abortEarly: false },
      cache: true,
    }),
  ],
  providers: [
    AppConfigService,
    AuthConfigService,
    DatabaseConfigService,
    RedisConfigService,
    StorageConfigService,
    MailConfigService,
    LoggerConfigService,
    CacheConfigService,
    ThrottlerConfigService,
    PusherConfigService,
    PayOSConfigService,
    QueueConfigService,
    MapConfigService,
    AIConfigService,
    OTPConfigService,
    PixabayConfigService,
    TTSConfigService,
  ],
  exports: [
    AppConfigService,
    AuthConfigService,
    DatabaseConfigService,
    RedisConfigService,
    StorageConfigService,
    MailConfigService,
    LoggerConfigService,
    CacheConfigService,
    ThrottlerConfigService,
    PusherConfigService,
    PayOSConfigService,
    QueueConfigService,
    MapConfigService,
    AIConfigService,
    OTPConfigService,
    PixabayConfigService,
    TTSConfigService,
  ],
})
export class ConfigModule {}
