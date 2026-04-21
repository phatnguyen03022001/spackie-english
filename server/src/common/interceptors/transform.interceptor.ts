// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
    !('data' in value) // Only treat as message-only if there's no data field
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

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
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
