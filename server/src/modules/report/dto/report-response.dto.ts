// src/modules/report/dto/report-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ReportResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  reporterId!: string;

  @ApiProperty({ example: 'DECK' })
  @Expose()
  targetType!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @Expose()
  targetId!: string;

  @ApiProperty({ example: 'SPAM' })
  @Expose()
  reason!: string;

  @ApiPropertyOptional({ example: 'This deck contains inappropriate content' })
  @Expose()
  description?: string;

  @ApiProperty({ example: 'PENDING' })
  @Expose()
  status!: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @Expose()
  resolvedBy?: string;

  @ApiPropertyOptional({ example: '2024-01-02T00:00:00.000Z' })
  @Expose()
  resolvedAt?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;
}
