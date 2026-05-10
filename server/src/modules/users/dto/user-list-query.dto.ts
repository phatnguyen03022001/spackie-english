// src/modules/users/dto/user-list-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UserListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Search by email, username, displayName',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'] })
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: string;

  @ApiPropertyOptional({ enum: ['active', 'banned', 'deleted'] })
  @IsOptional()
  @IsIn(['active', 'banned', 'deleted'])
  status?: string;

  @ApiPropertyOptional({
    example: 'createdAt:desc',
    description: 'Sort field and order (format: field:asc or field:desc)',
  })
  @IsOptional()
  @IsString()
  sort: string = 'createdAt:desc';
}
