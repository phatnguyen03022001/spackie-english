import { HttpException } from '@nestjs/common';
import type { HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(
      {
        code,
        message,
        details,
      },
      status,
    );
  }
}

export class AppException extends BusinessException {}
