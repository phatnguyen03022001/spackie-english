// src/modules/decks/dto/create-deck.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { DeckVisibility } from '@prisma/client';

export class CreateDeckDto {
  @ApiProperty({ example: 'My Vocabulary Deck' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false, example: 'A deck for learning new words' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DeckVisibility, default: DeckVisibility.PRIVATE })
  @IsOptional()
  @IsEnum(DeckVisibility)
  visibility?: DeckVisibility;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['toeic', 'grammar'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean;
}
