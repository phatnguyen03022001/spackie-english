// src/modules/listening/dto/submit-listening.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitListeningDto {
  @ApiPropertyOptional({ description: 'Audio recording as base64' })
  @IsOptional()
  @IsString()
  audioBase64?: string;

  @ApiPropertyOptional({ description: 'User transcript text' })
  @IsOptional()
  @IsString()
  transcriptText?: string;

  @ApiPropertyOptional({ description: 'Answers for comprehension exercises' })
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  @ApiProperty({ description: 'Score (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  score!: number;

  @ApiProperty({ description: 'Accuracy (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  accuracy!: number;

  @ApiProperty({ description: 'Fluency (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  fluency!: number;

  @ApiProperty({ description: 'Duration in milliseconds', minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  duration!: number;
}
