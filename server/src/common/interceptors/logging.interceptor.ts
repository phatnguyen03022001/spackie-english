// src/common/interceptors/logging.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { LoggerService } from '../logger/logger.service';

// Extend Request type to include requestId and user
interface RequestWithId extends Request {
  requestId?: string;
  user?: {
    id?: string;
  };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggerService: LoggerService) {
    this.loggerService.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    const res = context.switchToHttp().getResponse<Response>();

    // Generate or reuse request ID
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const start = Date.now();

    req.requestId = requestId;

    const userId = req.user?.id;

    // ✅ LOG REQUEST – gửi trực tiếp object (structured logging)
    this.loggerService.info({
      type: 'request',
      requestId,
      userId,
      method: req.method,
      path: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;

          // ✅ LOG RESPONSE – object trực tiếp
          this.loggerService.info({
            type: 'response',
            requestId,
            userId,
            method: req.method,
            path: req.url,
            statusCode: res.statusCode,
            durationMs,
            timestamp: new Date().toISOString(),
          });
        },
        error: (err: unknown) => {
          const durationMs = Date.now() - start;

          let statusCode = 500;
          let errorMessage = 'Internal server error';
          let stack: string | undefined;

          if (err instanceof HttpException) {
            statusCode = err.getStatus();
            errorMessage = err.message;
          } else if (err instanceof Error) {
            errorMessage = err.message;
            stack = err.stack;
          }

          // ✅ LOG ERROR – object trực tiếp, tận dụng tham số stack riêng
          this.loggerService.error(
            {
              type: 'error',
              requestId,
              userId,
              method: req.method,
              path: req.url,
              statusCode,
              durationMs,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            },
            stack, // stack trace được truyền riêng (phù hợp với signature của LoggerService.error)
          );
        },
      }),
    );
  }
}
