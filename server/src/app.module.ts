// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler'; // 👈 import kiểu
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Config
import { validationSchema } from './config/validation.schema';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import storageConfig from './config/storage.config';
import mailConfig from './config/mail.config';
import loggerConfig from './config/logger.config';
import cacheConfig from './config/cache.config';
import throttlerConfig from './config/throttler.config';
import pusherConfig from './config/pusher.config';
import payosConfig from './config/payos.config';
import queueConfig from './config/queue.config';
import mapConfig from './config/map.config';
import aiConfig from './config/ai.config';
import otpConfig from './config/otp.config';
import pixabayConfig from './config/pixabay.config';

// Common modules
import { LoggerModule } from './common/logger/logger.module';

// Common guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

// Common interceptors
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

// Infrastructure modules
import { RequestContextInterceptor } from './infrastructure/common/request-context.interceptor';
import { RedisModule } from './infrastructure/redis/redis.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { PaymentModule } from './infrastructure/payment/payment.module';
import { PusherModule } from './infrastructure/pusher/pusher.module';
import { ThirdPartyModule } from './infrastructure/third-party/third-party.module';

// Database
import { PrismaModule } from './database/prisma.module';

// Health module
import { HealthModule } from './modules/health/health.module';

// App root
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Business modules
import { UsersModule } from './modules/users/users.module';

// Lấy config và ép kiểu rõ ràng
const throttlerOptions: ThrottlerModuleOptions = throttlerConfig();

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
    LoggerModule,
    ThrottlerModule.forRoot(throttlerOptions), // 👈 dùng biến đã ép kiểu
    PrismaModule,
    RedisModule,
    StorageModule,
    MailModule,
    PaymentModule,
    PusherModule,
    ThirdPartyModule,
    HealthModule,

    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    CacheInterceptor,
    IdempotencyInterceptor,
  ],
})
export class AppModule {}
