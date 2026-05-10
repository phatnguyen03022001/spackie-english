// src/common/decorators/api-pagination.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { APP_CONSTANTS } from '@/common/constants/app.constant';

export function ApiPagination() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: APP_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    }),
    ApiQuery({
      name: 'sort',
      required: false,
      type: String,
      example: 'createdAt:desc',
      description: 'Sort field and order (format: field:asc or field:desc)',
    }),
  );
}
