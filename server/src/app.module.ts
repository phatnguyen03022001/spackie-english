import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { context, trace } from '@opentelemetry/api';
import crypto from 'node:crypto';

import config from './config';
import { validate } from './config/validation';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { MailModule } from '@/modules/mail/mail.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { VocabModule } from './modules/vocab/vocab.module';
import { IncomingMessage, ServerResponse } from 'http';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: config,
      validate,
      cache: true,
    }),

    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('app.env');
        const isProduction = env === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',

            // 1. NGĂN CHẶN DOUBLE LOGGING (Type-safe)
            customLogLevel: (
              _req: IncomingMessage,
              res: ServerResponse,
              err?: Error,
            ) => {
              // Nếu status >= 400 hoặc có lỗi, trả về 'silent'
              // để Pino Middleware không tự in dòng "request completed" nữa.
              // Lúc này chỉ có duy nhất log từ HttpExceptionFilter của bạn xuất hiện.
              if (res.statusCode >= 400 || err) return 'silent';
              return 'info';
            },

            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.confirmPassword',
                'req.body.newPassword',
              ],
              placeholder: '***HIDDEN***',
            },

            mixin() {
              const span = trace.getSpan(context.active());
              if (!span) return {};

              const { traceId, spanId } = span.spanContext();

              return {
                trace_id: traceId,
                span_id: spanId,
              };
            },

            genReqId: (req) =>
              req.headers['x-request-id'] || crypto.randomUUID(),

            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : {
                  target: 'pino-opentelemetry-transport',
                },
          },
        };
      },
    }),

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
  ],
})
export class AppModule {}
