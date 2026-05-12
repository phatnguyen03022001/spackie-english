// src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

// Guards
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CustomThrottlerGuard } from '@common/guards/throttler.guard';

// Interceptors
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { RequestContextInterceptor } from '@common/interceptors/request-context.interceptor';
import { CacheInterceptor } from '@common/interceptors/cache.interceptor';
// import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';

// Filters
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';

// Logger
import { LoggerModule } from '@common/logger/logger.module';
import { LoggerService } from '@common/logger/logger.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    // Guards – đăng ký global
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },

    // Interceptors – đăng ký global
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },

    // Filter – đăng ký global
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // Logger service (để các module khác inject)
    LoggerService,
  ],
  exports: [
    // Chỉ export LoggerService, các guards/interceptors/filters đã global không cần export
    LoggerService,
  ],
})
export class CommonModule {}
