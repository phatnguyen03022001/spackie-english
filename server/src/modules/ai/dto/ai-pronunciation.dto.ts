// src/modules/ai/dto/ai-pronunciation.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class AiPronunciationFeedbackRequestDto {
  @ApiProperty({
    example: 'ubiquitous',
    description: 'Text to analyze pronunciation',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @ApiPropertyOptional({ description: 'User audio recording (base64 encoded)' })
  @IsOptional()
  @IsString()
  userAudioBase64?: string;
}

export class AiPronunciationFeedbackResponseDto {
  @ApiProperty({ example: 'ubiquitous' })
  @Expose()
  text!: string;

  @ApiProperty({ example: '/juːˈbɪkwɪtəs/' })
  @Expose()
  phonetic!: string;

  @ApiProperty({
    example: 'Consider practicing the "biqui" syllable more slowly.',
  })
  @Expose()
  feedback!: string;

  @ApiProperty({ example: 3 })
  @Expose()
  difficulty!: number;

  @ApiProperty({ example: 'https://example.com/audio/ubiquitous.mp3' })
  @Expose()
  referenceAudioUrl?: string;
}
