import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  StreamableFile,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ICacheManager } from '../interfaces/cache-manager.interface';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { LoggerService } from '../logger/logger.service';

type RequestWithUser = Request & {
  user?: {
    id: string | number;
  };
};

type CachedResponse = {
  statusCode: number;
  body: unknown;
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly DEFAULT_TTL = 86400;
  private readonly PROCESSING_TTL = 30;
  private readonly MAX_SIZE = 100 * 1024;

  constructor(
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(IdempotencyInterceptor.name);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const res = context.switchToHttp().getResponse<Response>();

    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next.handle();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (!idempotencyKey) {
      return next.handle();
    }

    const actorId = req.user?.id?.toString() ?? 'anonymous';
    const routePath = (req.route as { path?: string })?.path ?? req.path;
    const cacheKey = `idempotency:${req.method}:${routePath}:${actorId}:${idempotencyKey}`;

    const cached = await this.cacheManager.get<CachedResponse | 'processing'>(
      cacheKey,
    );

    if (cached) {
      if (cached === 'processing') {
        res.status(HttpStatus.CONFLICT);
        res.setHeader('X-Idempotency-Status', 'processing');
        this.logger.debug({
          type: 'idempotency_conflict',
          key: cacheKey,
          actorId,
        });
        return of({
          statusCode: HttpStatus.CONFLICT,
          error: 'Request is already being processed. Please retry later.',
        });
      }

      res.status(cached.statusCode);
      res.setHeader('X-Idempotency-Replayed', 'true');
      this.logger.info({
        type: 'idempotency_replay',
        key: cacheKey,
        actorId,
        statusCode: cached.statusCode,
      });
      return of(cached.body);
    }

    await this.cacheManager.set(cacheKey, 'processing', this.PROCESSING_TTL);

    const ttl =
      this.configService.get<number>('cache.idempotencyTtl') ??
      this.DEFAULT_TTL;

    return next.handle().pipe(
      switchMap((data: unknown) => {
        const statusCode = res.statusCode;

        if (this.shouldCache(data, statusCode)) {
          const payload: CachedResponse = { statusCode, body: data };
          void this.cacheManager.set(cacheKey, payload, ttl);
          this.logger.debug({
            type: 'idempotency_cached',
            key: cacheKey,
            actorId,
            statusCode,
            size: this.getApproximateSize(data),
          });
        } else {
          void this.cacheManager.del(cacheKey).catch((err) => {
            this.logger.warn(
              `Failed to delete idempotency key ${cacheKey}: ${this.getErrorMessage(err)}`,
            );
          });
        }

        return of(data);
      }),
      catchError((err: unknown) => {
        void this.cacheManager.del(cacheKey).catch((delErr) => {
          this.logger.warn(
            `Failed to delete idempotency key on error: ${this.getErrorMessage(delErr)}`,
          );
        });

        this.logger.error({
          type: 'idempotency_error',
          key: cacheKey,
          actorId,
          error: this.getErrorMessage(err),
        });

        return throwError(() => err);
      }),
    );
  }

  private shouldCache(data: unknown, statusCode: number): boolean {
    if (statusCode < 200 || statusCode >= 300) return false;
    if (this.isStream(data)) return false;
    if (this.isTooLarge(data)) return false;
    return true;
  }

  private isStream(data: unknown): boolean {
    return data instanceof StreamableFile || data instanceof Readable;
  }

  private isTooLarge(data: unknown): boolean {
    try {
      const size = JSON.stringify(data).length;
      return size > this.MAX_SIZE;
    } catch {
      return true;
    }
  }

  private getApproximateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return -1;
    }
  }
}
