// src/modules/decks/dto/deck-list-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeckVisibility } from '@prisma/client';

export class DeckListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DeckVisibility })
  @IsOptional()
  @IsEnum(DeckVisibility)
  visibility?: DeckVisibility;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean;

  @ApiPropertyOptional({
    example: 'createdAt:desc',
    description: 'Sort field and order (format: field:asc or field:desc)',
  })
  @IsOptional()
  @IsString()
  sort: string = 'createdAt:desc';
}
