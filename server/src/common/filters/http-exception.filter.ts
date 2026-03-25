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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message = this.formatMessage(rawMessage);

    const logPayload = {
      status,
      path: request.originalUrl,
      method: request.method,
      query: request.query,
      params: request.params,
      message,
    };

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
        logPayload,
      );
    } else {
      this.logger.warn(logPayload);
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
      return rawMessage.filter((msg): msg is string => typeof msg === 'string');
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
