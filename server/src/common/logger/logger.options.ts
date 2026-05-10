// src/common/logger/logger.options.ts
import { ConfigService } from '@nestjs/config';
import type { LoggerModuleAsyncParams, Params } from 'nestjs-pino';
import { trace, context } from '@opentelemetry/api';
import type pino from 'pino';
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { safeSerialize } from '@common/utils/serialize.util';

type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent';

const resolveLogLevel = (res: ServerResponse, err?: Error): LogLevel => {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
};

interface TransportTarget {
  target: string;
  options?: Record<string, unknown>;
}

export const loggerOptions: LoggerModuleAsyncParams = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Params => {
    const env = configService.get<string>('app.env');
    const isProduction = env === 'production';
    const logResponseBody =
      configService.get<boolean>('logger.logResponseBody') ?? !isProduction;
    const logRequestBody =
      configService.get<boolean>('logger.logRequestBody') ?? !isProduction;
    const rawRedactPaths = configService.get<string[]>('logger.redactPaths');
    const redactPaths = Array.isArray(rawRedactPaths) ? rawRedactPaths : [];

    // Kiểm tra xem có cấu hình OpenTelemetry OTLP endpoint hay không
    const otlpEndpoint = configService.get<string>(
      'otel.exporter.otlp.endpoint',
    );
    const useOtlp = isProduction && !!otlpEndpoint;

    // Transport cho production: luôn ghi log ra file (rotate hàng ngày)
    // Nếu có OTLP endpoint, thêm transport thứ hai để gửi log qua OpenTelemetry
    const transports: TransportTarget[] = [
      {
        target: 'pino-daily-rotate-file',
        options: {
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m', // dung lượng tối đa mỗi file
          maxFiles: '14d', // giữ log 14 ngày
          mkdir: true,
          compress: true, // nén file cũ
        },
      },
    ];

    if (useOtlp) {
      transports.push({
        target: 'pino-opentelemetry-transport',
        options: {
          // Có thể thêm cấu hình nếu cần (service name, ...)
        },
      });
    }

    // Dev environment: chỉ dùng pretty print
    const transport = !isProduction
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : {
          targets: transports,
        };

    return {
      pinoHttp: {
        level: configService.get<string>(
          'logger.level',
          isProduction ? 'info' : 'debug',
        ),
        customLogLevel: (
          _req: IncomingMessage,
          res: ServerResponse,
          err?: Error,
        ): LogLevel => resolveLogLevel(res, err),
        customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
          `${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (
          req: IncomingMessage,
          res: ServerResponse,
          err: Error,
        ) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
        redact: {
          paths: redactPaths,
          censor: '[REDACTED]',
        } satisfies pino.redactOptions,
        mixin(): Record<string, string> {
          const span = trace.getSpan(context.active());
          if (!span) return {};
          const { traceId, spanId } = span.spanContext();
          return { trace_id: traceId, span_id: spanId };
        },
        genReqId: (req: IncomingMessage): string => {
          const existingId = req.headers['x-request-id'];
          if (Array.isArray(existingId)) return existingId[0];
          return existingId ?? crypto.randomUUID();
        },
        serializers: {
          req(req: IncomingMessage & { body?: unknown }) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              ...(logRequestBody && req.body !== undefined
                ? { body: safeSerialize(req.body) }
                : {}),
            };
          },
          res(res: ServerResponse & { body?: unknown }) {
            return {
              statusCode: res.statusCode,
              ...(logResponseBody && res.body !== undefined
                ? { body: safeSerialize(res.body) }
                : {}),
            };
          },
        },
        transport,
      },
    };
  },
};
