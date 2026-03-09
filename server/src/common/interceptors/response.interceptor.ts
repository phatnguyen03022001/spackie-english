// src/common/interceptors/response.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseDto<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: T | ApiResponseDto<T>) => {
        if (data instanceof ApiResponseDto) {
          return data;
        }

        return new ApiResponseDto<T>(
          data ?? null,
          'Success',
          response.statusCode,
          true,
        );
      }),
    );
  }
}
