// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SKIP_TRANSFORM_KEY } from '@common/decorators/skip-transform.decorator';

export interface SuccessResponse<T> {
  success: true;
  data: T | T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

interface PaginatedData<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

function isPaginatedData<T>(value: unknown): value is PaginatedData<T> {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (!('data' in obj) || !('meta' in obj)) return false;
  const meta = obj.meta;
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m.page === 'number' &&
    typeof m.limit === 'number' &&
    typeof m.total === 'number' &&
    typeof m.totalPages === 'number'
  );
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string' &&
    !('data' in value)
  );
}

function hasDataAndMessage(
  value: unknown,
): value is { data: unknown; message: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'data' in value &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

function isSuccessResponseDtoShape(
  value: unknown,
): value is { success: true; data: unknown; message?: string; meta?: unknown } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return obj.success === true && 'data' in obj;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    // Check if this endpoint should skip transformation
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipTransform) {
      return next.handle() as Observable<SuccessResponse<T>>;
    }

    return next.handle().pipe(
      map((data: unknown) => {
        if (isPaginatedData<T>(data)) {
          const response: SuccessResponse<T> = {
            success: true,
            data: data.data,
            meta: data.meta,
          };
          if (data.message) response.message = data.message;
          return response;
        }

        if (hasDataAndMessage(data)) {
          return {
            success: true,
            data: data.data as T,
            message: data.message,
          };
        }

        if (isSuccessResponseDtoShape(data)) {
          const response: SuccessResponse<T> = {
            success: true,
            data: data.data as T,
          };

          if ('meta' in data && data.meta) {
            response.meta = data.meta as SuccessResponse<T>['meta'];
          }

          if ('message' in data && typeof data.message === 'string') {
            response.message = data.message;
          }

          return response;
        }

        if (hasMessage(data)) {
          return {
            success: true,
            data: null as unknown as T,
            message: data.message,
          };
        }

        return {
          success: true,
          data: data as T,
        };
      }),
    );
  }
}
