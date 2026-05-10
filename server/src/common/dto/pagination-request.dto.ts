// src/common/dto/pagination-request.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { APP_CONSTANTS } from '@common/constants/app.constant';

export class PaginationRequestDto {
  @ApiPropertyOptional({ default: APP_CONSTANTS.PAGINATION.DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page: number = APP_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({ default: APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(APP_CONSTANTS.PAGINATION.MAX_LIMIT)
  limit: number = APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT;

  @ApiPropertyOptional({
    example: 'createdAt:desc',
    description: 'Sort field and order (format: field:asc or field:desc)',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt:desc';
}
