// src/modules/activity/dto/activity-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ActivityResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'VIEW_DECK' })
  @Expose()
  type!: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @Expose()
  targetId?: string;

  @ApiPropertyOptional({ example: { deckTitle: 'English Grammar' } })
  @Expose()
  details?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;
}
