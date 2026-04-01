// src/common/logger/logger.options.ts

import { ConfigService } from '@nestjs/config';
import type { LoggerModuleAsyncParams, Params } from 'nestjs-pino';
import { trace, context } from '@opentelemetry/api';
import type pino from 'pino';
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { safeSerialize } from '../utils/serialize'; // ✅ import

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
        transport: !isProduction
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
              target: 'pino-opentelemetry-transport',
            },
      },
    };
  },
};
