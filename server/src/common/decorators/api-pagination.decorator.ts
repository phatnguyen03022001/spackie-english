// src/common/decorators/api-pagination.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { APP_CONSTANTS } from '../constants/app.constant';

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
      name: 'sortBy',
      required: false,
      type: String,
      example: 'createdAt',
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      enum: ['ASC', 'DESC'],
      example: 'DESC',
    }),
  );
}
