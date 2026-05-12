// src/modules/ai/dto/ai-examples.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';

export class AiExamplesRequestDto {
  @ApiProperty({
    example: 'ubiquitous',
    description: 'Word to get examples for',
  })
  @IsString()
  @MinLength(1)
  word!: string;

  @ApiPropertyOptional({ example: 5, description: 'Number of examples (1-10)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  count?: number;
}

export class AiExamplesResponseDto {
  @ApiProperty({ example: 'ubiquitous' })
  @Expose()
  word!: string;

  @ApiProperty({ example: 5 })
  @Expose()
  count!: number;

  @ApiProperty({
    example: [
      {
        sentence: 'Mobile phones are ubiquitous in modern society.',
        translation:
          'Điện thoại di động có mặt khắp nơi trong xã hội hiện đại.',
      },
    ],
  })
  @Expose()
  examples!: Array<{ sentence: string; translation?: string }>;
}
