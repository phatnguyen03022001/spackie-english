import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { context, trace } from '@opentelemetry/api';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

        mixin() {
          const span = trace.getSpan(context.active());
          if (!span) return {};

          const { traceId, spanId } = span.spanContext();
          return { trace_id: traceId, span_id: spanId };
        },

        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : { target: 'pino-opentelemetry-transport' },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
