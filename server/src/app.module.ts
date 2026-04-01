import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import config from './config';
import { validate } from './config/validation';
import { loggerOptions } from './common/logger/logger.options';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { MailModule } from '@/modules/mail/mail.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';
import { VocabModule } from './modules/vocab/vocab.module';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: config,
      validate,
      cache: true,
    }),

    // Logger nay đã gọn gàng hơn rất nhiều
    LoggerModule.forRootAsync(loggerOptions),

    PrismaModule,
    AuthModule,
    MailModule,
    UploadModule,
    UsersModule,
    VocabModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
