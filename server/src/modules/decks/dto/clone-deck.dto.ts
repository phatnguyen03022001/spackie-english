// src/modules/decks/dto/clone-deck.dto.ts
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { DeckVisibility } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloneDeckDto {
  @ApiPropertyOptional({ description: 'New title for the cloned deck' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    enum: DeckVisibility,
    default: DeckVisibility.PRIVATE,
    description: 'Visibility of the cloned deck',
  })
  @IsOptional()
  @IsEnum(DeckVisibility)
  visibility?: DeckVisibility;
}
