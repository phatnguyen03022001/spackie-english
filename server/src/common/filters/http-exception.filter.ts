import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
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

    const formattedMessage = this.formatMessage(rawMessage);

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.originalUrl,
      message: formattedMessage,
      timestamp: new Date().toISOString(),
    });
  }

  private formatMessage(rawMessage: unknown): string[] {
    if (typeof rawMessage === 'string') {
      return [rawMessage];
    }

    if (Array.isArray(rawMessage)) {
      return rawMessage.map((item) => this.toStringValue(item));
    }

    if (rawMessage && typeof rawMessage === 'object') {
      if ('message' in rawMessage) {
        const msg = (rawMessage as { message?: unknown }).message;

        if (Array.isArray(msg)) {
          return msg.map((item) => this.toStringValue(item));
        }

        if (msg !== undefined) {
          return [this.toStringValue(msg)];
        }
      }

      return [JSON.stringify(rawMessage)];
    }

    return [this.toStringValue(rawMessage)];
  }

  private toStringValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return value.toString();
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return 'Object';
      }
    }

    return '';
  }
}
