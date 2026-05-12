// src/modules/bulk/dto/bulk-move.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkMoveCardsDto {
  @ApiProperty({
    example: ['cardId1', 'cardId2'],
    description: 'Array of globalCard IDs to move',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  cardIds!: string[];

  @ApiProperty({ example: 'sourceDeckId1', description: 'Source deck ID' })
  @IsString()
  sourceDeckId!: string;

  @ApiProperty({ example: 'targetDeckId1', description: 'Target deck ID' })
  @IsString()
  targetDeckId!: string;
}
