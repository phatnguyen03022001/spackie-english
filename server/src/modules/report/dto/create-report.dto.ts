// src/modules/report/dto/create-report.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ['DECK', 'CARD', 'USER'], example: 'DECK' })
  @IsString()
  @IsIn(['DECK', 'CARD', 'USER'])
  targetType!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  targetId!: string;

  @ApiProperty({
    enum: ['SPAM', 'OFFENSIVE', 'COPYRIGHT', 'OTHER'],
    example: 'SPAM',
  })
  @IsString()
  @IsIn(['SPAM', 'OFFENSIVE', 'COPYRIGHT', 'OTHER'])
  reason!: string;

  @ApiPropertyOptional({ example: 'This deck contains inappropriate content' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;
}
