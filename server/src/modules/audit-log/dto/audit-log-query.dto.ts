// src/modules/audit-log/dto/audit-log-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';

export class AuditLogQueryDto extends PaginationRequestDto {
  @ApiPropertyOptional({ description: 'Filter by userId' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by action type' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Sort field and direction (e.g. "createdAt:desc")',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
