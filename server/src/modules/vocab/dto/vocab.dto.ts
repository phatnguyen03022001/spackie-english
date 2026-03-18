// src/modules/vocab/dto/vocab.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- SHARED TYPES ---
export class DefinitionDto {
  @IsString()
  definition: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  antonyms?: string[];
}

export class MeaningDto {
  @IsString()
  partOfSpeech: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefinitionDto)
  definitions: DefinitionDto[];
}

// --- DECK DTOS ---
export class CreateDeckDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  levelTag?: string;
}

export class UpdateDeckDto extends CreateDeckDto {}

// --- CARD DTOS ---
export class CreateCardDto {
  @IsString()
  word: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeaningDto)
  meanings: MeaningDto[];
}

export class BulkCreateCardsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, {
    message: 'Chỉ được phép thêm tối đa 10 từ mỗi lần để đảm bảo tốc độ.',
  })
  @IsNotEmpty({ each: true })
  words: string[];
}

// --- REVIEW DTOS ---
export class AnswerCardDto {
  @IsNumber()
  @Min(1) // 1: Again
  @Max(4) // 4: Easy
  grade: number;
}

import { PartialType } from '@nestjs/mapped-types';

export class UpdateCardDto extends PartialType(CreateCardDto) {
  // Thêm field này nếu bạn cho phép chuyển card sang Deck khác
  @IsOptional()
  @IsString()
  deckId?: string;

  // Cho phép update trạng thái học tập thủ công (nếu cần)
  @IsOptional()
  @IsString()
  status?: string;
}
