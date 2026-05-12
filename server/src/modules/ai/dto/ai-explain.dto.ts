// src/modules/ai/dto/ai-explain.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class AiExplainRequestDto {
  @ApiProperty({ example: 'ubiquitous', description: 'Word to explain' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  word!: string;
}

export class AiExplainResponseDto {
  @ApiProperty({ example: 'ubiquitous' })
  @Expose()
  word!: string;

  @ApiProperty({ example: '/juːˈbɪkwɪtəs/' })
  @Expose()
  pronunciation!: string;

  @ApiProperty({ example: 'adjective' })
  @Expose()
  partOfSpeech!: string;

  @ApiProperty({ example: 'Present, appearing, or found everywhere.' })
  @Expose()
  definition!: string;

  @ApiProperty({
    example: ['Mobile phones are ubiquitous in modern society.'],
  })
  @Expose()
  examples!: string[];

  @ApiProperty({ example: ['omnipresent', 'pervasive', 'universal'] })
  @Expose()
  synonyms!: string[];

  @ApiProperty({ example: ['rare', 'scarce', 'uncommon'] })
  @Expose()
  antonyms!: string[];
}
