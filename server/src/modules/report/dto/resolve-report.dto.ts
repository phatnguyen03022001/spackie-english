// src/modules/report/dto/resolve-report.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';

export class ResolveReportDto {
  @ApiProperty({ enum: ['RESOLVED', 'REJECTED'], example: 'RESOLVED' })
  @IsString()
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: string;

  @ApiPropertyOptional({ example: 'Content has been reviewed and removed' })
  @IsOptional()
  @IsString()
  note?: string;
}
