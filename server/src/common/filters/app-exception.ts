import { HttpException } from '@nestjs/common';
import type { HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
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
