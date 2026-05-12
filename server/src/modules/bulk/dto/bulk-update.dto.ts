// src/modules/bulk/dto/bulk-update.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';

export class BulkUpdateCardsDto {
  @ApiProperty({
    example: ['cardId1', 'cardId2'],
    description: 'Array of globalCard IDs to update',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  cardIds!: string[];

  @ApiPropertyOptional({ example: 'Updated front text' })
  @IsOptional()
  @IsString()
  front?: string;

  @ApiPropertyOptional({ example: 'Updated back text' })
  @IsOptional()
  @IsString()
  back?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-audio.mp3' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ example: { hint: 'new hint' } })
  @IsOptional()
  extras?: Record<string, unknown>;
}
