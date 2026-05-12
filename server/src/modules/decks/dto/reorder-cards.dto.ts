// src/modules/decks/dto/reorder-cards.dto.ts
import {
  IsArray,
  ArrayMinSize,
  IsString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReorderItemDto {
  @ApiProperty({ description: 'Global card ID' })
  @IsString()
  cardId!: string;

  @ApiProperty({ description: 'New sort order (0-based)', example: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderCardsDto {
  @ApiProperty({
    type: [ReorderItemDto],
    description: 'Array of card IDs with new sort orders',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
