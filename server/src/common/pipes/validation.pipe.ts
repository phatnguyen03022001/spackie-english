// src/common/pipes/validation.pipe.ts
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ERROR_CODES } from '@common/constants/error-codes.const';

interface FormattedValidationError {
  code: string;
  message: string;
  details: Record<string, string[]>;
}

/**
 * Format validation errors into structured object with field-specific details.
 * Follows error code convention: DOMAIN_ACTION_REASON (VALIDATION_ERROR)
 */
function formatValidationErrors(
  errors: ValidationError[],
): FormattedValidationError {
  const details: Record<string, string[]> = {};

  const flatten = (err: ValidationError, parent?: string) => {
    const propertyPath = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      details[propertyPath] = Object.values(err.constraints);
    }
    if (err.children?.length) {
      err.children.forEach((child) => flatten(child, propertyPath));
    }
  };

  errors.forEach((err) => flatten(err));

  return {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: 'Validation failed',
    details,
  };
}

export const GlobalValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: (errors: ValidationError[]) => {
    const { code, message, details } = formatValidationErrors(errors);
    return new BadRequestException({
      code,
      message,
      details,
    });
  },
});
