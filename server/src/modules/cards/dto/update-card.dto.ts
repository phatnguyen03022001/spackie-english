// src/modules/cards/dto/update-card.dto.ts
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCardDto } from './create-card.dto';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CardExtrasDto {
  @ApiProperty({ required: false, description: 'IPA pronunciation' })
  @IsOptional()
  @IsString()
  pronounce?: string;

  @ApiProperty({ required: false, description: 'Part of speech' })
  @IsOptional()
  @IsString()
  pos?: string;

  @ApiProperty({ required: false, description: 'Vietnamese meaning' })
  @IsOptional()
  @IsString()
  vi?: string;

  @ApiProperty({
    required: false,
    description: 'Exactly 2 example sentences',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  examples?: string[];

  @ApiProperty({ required: false, description: 'Comma-separated synonyms' })
  @IsOptional()
  @IsString()
  synonyms?: string;

  @ApiProperty({ required: false, description: 'Comma-separated antonyms' })
  @IsOptional()
  @IsString()
  antonyms?: string;
}

export class UpdateCardDto extends PartialType(CreateCardDto) {
  @ApiProperty({ required: false, description: 'Image URL for the card' })
  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2000)
  imageUrl?: string;

  @ApiProperty({ required: false, description: 'Audio URL for the card' })
  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2000)
  audioUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Card extras (meaning data)',
    type: CardExtrasDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CardExtrasDto)
  extras?: CardExtrasDto;
}
