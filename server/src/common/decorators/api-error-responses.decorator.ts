// src/common/decorators/api-error-responses.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Bad Request - Validation failed or invalid data',
  401: 'Unauthorized - Missing or invalid token',
  403: 'Forbidden - Insufficient permissions',
  404: 'Not Found - Resource does not exist',
  409: 'Conflict - Duplicate entry',
  422: 'Unprocessable Entity - Invalid file type or size',
  429: 'Too Many Requests - Rate limit exceeded',
};

/**
 * Custom decorator to add standard error ApiResponse decorators
 * with schema reference to ErrorResponseDto.
 *
 * @example
 * ```typescript
 * @ApiErrorResponses([400, 401, 404])
 * async myEndpoint() { ... }
 * ```
 */
export function ApiErrorResponses(statuses: number[]) {
  const decorators = statuses.map((status) =>
    ApiResponse({
      status,
      description: ERROR_DESCRIPTIONS[status] ?? 'Error occurred',
      schema: { $ref: '#/components/schemas/ErrorResponseDto' },
    }),
  );
  return applyDecorators(...decorators);
}
