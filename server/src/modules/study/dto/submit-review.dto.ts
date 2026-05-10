// src/modules/study/dto/submit-review.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { CardRating } from '@prisma/client';

export class SubmitReviewDto {
  @ApiProperty({ description: 'Global card ID' })
  @IsString()
  globalCardId!: string;

  @ApiProperty({ enum: CardRating })
  @IsEnum(CardRating)
  rating!: CardRating;

  @ApiPropertyOptional({ description: 'Review duration in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewDurationMs?: number;
}
