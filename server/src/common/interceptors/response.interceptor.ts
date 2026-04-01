import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response, Request } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';
import { PinoLogger } from 'nestjs-pino';
import { safeSerialize } from '../utils/serialize';

interface ResponseWithBody extends Response {
  body?: unknown;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseDto<T>
> {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ResponseInterceptor.name);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<ResponseWithBody>();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data: T | ApiResponseDto<T>) => {
        const wrapped =
          data instanceof ApiResponseDto
            ? data
            : new ApiResponseDto<T>(
                data ?? null,
                'Success',
                response.statusCode,
                true,
              );

        // Gán body để logger (pino-http) có thể đọc
        response.body = wrapped;

        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            {
              req_body: safeSerialize(request.body),
              res_body: safeSerialize(wrapped),
            },
            `${request.method} ${request.url} body`,
          );
        }

        return wrapped;
      }),
    );
  }
}
