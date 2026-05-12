// src/modules/report/dto/report-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';

export class ReportQueryDto extends PaginationRequestDto {
  @ApiPropertyOptional({
    enum: ['PENDING', 'RESOLVED', 'REJECTED'],
    description: 'Filter by status',
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'RESOLVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({
    enum: ['DECK', 'CARD', 'USER'],
    description: 'Filter by target type',
  })
  @IsOptional()
  @IsString()
  @IsIn(['DECK', 'CARD', 'USER'])
  targetType?: string;
}
