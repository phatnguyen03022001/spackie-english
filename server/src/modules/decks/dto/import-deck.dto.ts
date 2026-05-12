// src/modules/decks/dto/import-deck.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImportCardDto {
  @ApiProperty({ description: 'Card front text' })
  @IsString()
  front!: string;

  @ApiProperty({ description: 'Card back text', required: false })
  @IsOptional()
  @IsString()
  back?: string;

  @ApiProperty({
    description: 'Card extras (definitions, examples, etc.)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extras?: Record<string, unknown>;
}

export class ImportDeckDto {
  @ApiProperty({ description: 'Deck title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Deck description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String], description: 'Deck tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: [ImportCardDto], description: 'Cards to import' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportCardDto)
  cards!: ImportCardDto[];
}
