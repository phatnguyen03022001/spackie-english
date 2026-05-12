// src/modules/search/dto/search-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  IsIn,
} from 'class-validator';

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query (min 2 chars)' })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({ enum: ['decks', 'cards'] })
  @IsOptional()
  @IsIn(['decks', 'cards'])
  type?: 'decks' | 'cards';
}
