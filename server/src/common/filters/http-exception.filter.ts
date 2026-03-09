// src/common/filters/http-exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status: HttpStatus =
      exception instanceof HttpException
        ? (exception.getStatus() as HttpStatus)
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage: unknown =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message = this.formatMessage(rawMessage);

    // log server error
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      data: null,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private formatMessage(rawMessage: unknown): string[] {
    if (typeof rawMessage === 'string') {
      return [rawMessage];
    }

    if (Array.isArray(rawMessage)) {
      return rawMessage
        .filter((msg): msg is string => typeof msg === 'string')
        .map((msg) => msg);
    }

    if (rawMessage && typeof rawMessage === 'object') {
      const obj = rawMessage as { message?: unknown };

      if (Array.isArray(obj.message)) {
        return obj.message.filter(
          (msg): msg is string => typeof msg === 'string',
        );
      }

      if (typeof obj.message === 'string') {
        return [obj.message];
      }
    }

    return ['Internal server error'];
  }
}
