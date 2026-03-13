import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { context, trace } from '@opentelemetry/api';

import config from './config';
import { validate } from './config/validation';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: config,
      validate,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level:
            configService.get<string>('app.env') === 'production'
              ? 'info'
              : 'debug',

          mixin() {
            const span = trace.getSpan(context.active());
            if (!span) return {};

            const { traceId, spanId } = span.spanContext();
            return {
              trace_id: traceId,
              span_id: spanId,
            };
          },

          transport:
            configService.get<string>('app.env') !== 'production'
              ? { target: 'pino-pretty' }
              : { target: 'pino-opentelemetry-transport' },
        },
      }),
    }),
    PrismaModule,
    AuthModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
