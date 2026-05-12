// src/modules/search/dto/search-suggest.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchSuggestDto {
  @ApiProperty({ description: 'Search query (min 2 chars)' })
  @IsString()
  @MinLength(2)
  q!: string;
}
