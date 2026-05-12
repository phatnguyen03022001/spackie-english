// src/modules/ai/dto/ai-translate.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class AiTranslateRequestDto {
  @ApiProperty({
    example: 'Hello, how are you?',
    description: 'Text to translate',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({ example: 'en', description: 'Source language code' })
  @IsOptional()
  @IsString()
  sourceLang?: string;

  @ApiPropertyOptional({ example: 'vi', description: 'Target language code' })
  @IsOptional()
  @IsString()
  targetLang?: string;
}

export class AiTranslateResponseDto {
  @ApiProperty({ example: 'Xin chào, bạn khỏe không?' })
  @Expose()
  translatedText!: string;

  @ApiProperty({ example: 'en' })
  @Expose()
  sourceLang!: string;

  @ApiProperty({ example: 'vi' })
  @Expose()
  targetLang!: string;
}
