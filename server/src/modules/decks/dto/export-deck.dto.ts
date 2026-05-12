// src/modules/decks/dto/export-deck.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ExportDeckDto {
  @ApiProperty({
    enum: ['json'],
    default: 'json',
    description: 'Export format',
  })
  format!: string;
}

export class ExportedCardDto {
  @ApiProperty({ description: 'Card front text' })
  front!: string;

  @ApiProperty({ description: 'Card back text', required: false })
  back?: string;

  @ApiProperty({
    description: 'Card extras (definitions, examples, etc.)',
    required: false,
  })
  extras?: Record<string, unknown>;
}

export class ExportedDeckDto {
  @ApiProperty({ description: 'Deck title' })
  title!: string;

  @ApiProperty({ description: 'Deck description', required: false })
  description?: string;

  @ApiProperty({ type: [String], description: 'Deck tags' })
  tags!: string[];

  @ApiProperty({ description: 'Export timestamp' })
  exportedAt!: string;

  @ApiProperty({ type: [ExportedCardDto], description: 'Cards in deck' })
  cards!: ExportedCardDto[];
}
