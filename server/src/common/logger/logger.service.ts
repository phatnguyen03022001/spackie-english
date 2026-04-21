// src/common/logger/logger.service.ts

import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  constructor(private readonly logger: PinoLogger) {}

  setContext(context: string): void {
    this.logger.setContext(context);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(message as never, ...optionalParams);
  }

  info(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(message as never, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(message as never, ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(message as never, ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.trace(message as never, ...optionalParams);
  }

  error(message: unknown, stack?: string, context?: string): void {
    if (message instanceof Error) {
      this.logger.error(
        {
          err: message,
          stack: stack || message.stack,
          context,
        },
        message.message,
      );
      return;
    }

    this.logger.error(
      {
        err: message,
        stack,
        context,
      },
      typeof message === 'string' ? message : 'Error',
    );
  }
}
