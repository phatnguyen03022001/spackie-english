// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from, lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CACHE_TTL_KEY } from '@common/decorators/cache-ttl.decorator';
import { ConfigService } from '@nestjs/config';
import { RedisLockService } from '@/infrastructure/redis/redis-lock.service';
import { Mutex } from 'async-mutex';

@Injectable()
export class CacheInterceptor<T> implements NestInterceptor<T, T> {
  private readonly mutexMap = new Map<string, Mutex>();
  private readonly useDistributedLock: boolean;

  constructor(
    private readonly reflector: Reflector,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly configService: ConfigService,
    @Optional() private readonly redisLockService?: RedisLockService,
  ) {
    this.useDistributedLock = !!this.redisLockService;
  }

  private getMutex(key: string): Mutex {
    if (!this.mutexMap.has(key)) {
      this.mutexMap.set(key, new Mutex());
    }
    return this.mutexMap.get(key)!;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<Observable<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `cache:${request.url}:${JSON.stringify(request.query)}`;
    const ttl = this.getTtl(context);

    if (!ttl || ttl <= 0) {
      return next.handle();
    }

    // Check cache
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return of(cached as T);
      }
    } catch {
      // ignore
    }

    // Use distributed lock if available, otherwise fallback to in-memory mutex
    if (this.useDistributedLock) {
      return from(this.handleWithDistributedLock(cacheKey, ttl, next));
    } else {
      return from(this.handleWithLocalMutex(cacheKey, ttl, next));
    }
  }

  private async handleWithDistributedLock(
    cacheKey: string,
    ttl: number,
    next: CallHandler<T>,
  ): Promise<T> {
    const lockKey = `lock:${cacheKey}`;
    // Use RedisLockService with lock TTL slightly longer than expected DB query time (e.g., 30s)
    return this.redisLockService!.withLock(lockKey, 30, async () => {
      // Double-check cache after acquiring lock
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached as T;
        }
      } catch {
        // ignore
      }

      const response = await lastValueFrom(next.handle());

      try {
        if (response !== null && response !== undefined) {
          await this.cacheManager.set(cacheKey, response, ttl);
        }
      } catch {
        // non-critical
      }

      return response;
    });
  }

  private async handleWithLocalMutex(
    cacheKey: string,
    ttl: number,
    next: CallHandler<T>,
  ): Promise<T> {
    const mutex = this.getMutex(cacheKey);
    return mutex.runExclusive(async () => {
      // Double-check
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached as T;
        }
      } catch {
        // ignore
      }

      const response = await lastValueFrom(next.handle());

      try {
        if (response !== null && response !== undefined) {
          await this.cacheManager.set(cacheKey, response, ttl);
        }
      } catch {
        // ignore
      }

      return response;
    });
  }

  private getTtl(context: ExecutionContext): number {
    const ttlFromDecorator = this.reflector.getAllAndOverride<number>(
      CACHE_TTL_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (ttlFromDecorator) return ttlFromDecorator;
    return this.configService.get<number>('cache.defaultTtl', 300);
  }
}
