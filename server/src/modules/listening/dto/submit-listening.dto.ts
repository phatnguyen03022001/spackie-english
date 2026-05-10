// src/modules/listening/dto/submit-listening.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

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
}
