// src/modules/bulk/dto/bulk-delete.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';

export class BulkDeleteCardsDto {
  @ApiProperty({
    example: ['cardId1', 'cardId2'],
    description: 'Array of globalCard IDs to delete',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  cardIds!: string[];

  @ApiPropertyOptional({
    example: 'deckId1',
    description:
      'If provided, only remove mapping from this deck instead of global delete',
  })
  @IsOptional()
  @IsString()
  deckId?: string;
}
