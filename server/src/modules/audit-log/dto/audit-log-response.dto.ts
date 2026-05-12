// src/modules/audit-log/dto/audit-log-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AuditLogResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  userId!: string;

  @ApiProperty({ example: 'LOGIN' })
  @Expose()
  action!: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @Expose()
  targetId?: string;

  @ApiPropertyOptional({
    example: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
  })
  @Expose()
  details?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;
}
