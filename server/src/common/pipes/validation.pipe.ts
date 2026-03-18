import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    if (error.children && error.children.length > 0) {
      return flattenValidationErrors(error.children);
    }
    return error.constraints ? Object.values(error.constraints) : [];
  });
}

export const GlobalValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: (errors) => {
    const messages = flattenValidationErrors(errors);
    return new BadRequestException(messages);
  },
});
