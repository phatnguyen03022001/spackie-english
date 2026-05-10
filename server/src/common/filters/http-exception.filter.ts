// src/common/filters/http-exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { ERROR_CODES } from '@common/constants';

@Catch(HttpException, Error)
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { request, response } = this.getContext(host);

    const { status, code, message, details, stack } =
      this.normalizeException(exception);

    const errorResponse = new ErrorResponseDto(
      status,
      code,
      message,
      request.url,
      details,
    );

    this.logException(
      request,
      status,
      code,
      message,
      exception,
      stack,
      details,
    );

    response.status(status).json(errorResponse);
  }

  // =====================
  // CONTEXT HELPERS
  // =====================
  private getContext(host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    return {
      request: ctx.getRequest<Request>(),
      response: ctx.getResponse<Response>(),
    };
  }

  // =====================
  // NORMALIZATION LAYER
  // =====================
  private normalizeException(exception: unknown): {
    status: HttpStatus;
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  } {
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let details: unknown;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res: unknown = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errObj = res as {
          code?: string;
          message?: string | string[];
          details?: unknown;
        };

        code = errObj.code ?? this.mapStatusToCode(status);

        message = Array.isArray(errObj.message)
          ? errObj.message.join(', ')
          : (errObj.message ?? exception.message);

        details = errObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    // attach stack only in dev
    const isProduction =
      this.configService.get<string>('app.env') === 'production';
    if (!isProduction && stack) {
      details = {
        ...(typeof details === 'object' && details ? details : {}),
        stack,
      };
    }

    return { status, code, message, details, stack };
  }

  // =====================
  // LOGGING
  // =====================
  private logException(
    request: Request,
    status: number,
    code: string,
    message: string,
    exception: unknown,
    stack?: string,
    details?: unknown,
  ) {
    const logPayload = {
      path: request.url,
      method: request.method,
      status,
      body: request.body as unknown,
      details,
    };

    const logMessage = `[${request.method}] ${request.url} - ${code}: ${message}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : stack,
        JSON.stringify(logPayload),
      );
    } else {
      this.logger.warn(logMessage, undefined, JSON.stringify(logPayload));
    }
  }

  // =====================
  // STATUS MAP
  // =====================
  private mapStatusToCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.AUTH_INVALID_TOKEN;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.DUPLICATE_ENTRY;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
