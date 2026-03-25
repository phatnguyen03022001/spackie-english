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
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardStatus } from '@prisma/client';

/* =========================
   SHARED TYPES (Embedded in MongoDB)
========================= */

export class DefinitionDto {
  @ApiProperty({ example: 'To persist in spite of opposition' })
  @IsString()
  @IsNotEmpty()
  definition: string;

  @ApiPropertyOptional({ example: 'She persevered in her studies.' })
  @IsOptional()
  @IsString()
  example?: string;

  @ApiPropertyOptional({ type: [String], example: ['persist', 'continue'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  @ApiPropertyOptional({ type: [String], example: ['give up'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  antonyms?: string[];
}

export class MeaningDto {
  @ApiProperty({ example: 'verb' })
  @IsString()
  @IsNotEmpty()
  partOfSpeech: string;

  @ApiProperty({ type: [DefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefinitionDto)
  definitions: DefinitionDto[];
}

/* =========================
   DECK DTOS
========================= */

export class CreateDeckDto {
  @ApiProperty({ example: 'IELTS Essential Words' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Common words for IELTS exam' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 'B2' })
  @IsOptional()
  @IsString()
  levelTag?: string;
}

export class UpdateDeckDto extends PartialType(CreateDeckDto) {}

/* =========================
   CARD DTOS
========================= */

export class CreateCardDto {
  @ApiProperty({ example: 'persevere' })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiPropertyOptional({ example: '/ˌpɜː.sɪˈvɪər/' })
  @IsOptional()
  @IsString()
  phonetic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiProperty({ type: [MeaningDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeaningDto)
  meanings: MeaningDto[];
}

export class UpdateCardDto extends PartialType(CreateCardDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deckId?: string;

  @ApiPropertyOptional({ enum: CardStatus })
  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;
}

export class BulkCreateCardsDto {
  @ApiProperty({ type: [String], example: ['apple', 'banana'], maxItems: 30 })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @IsNotEmpty({ each: true })
  words: string[];
}

/* =========================
   REVIEW & SYNC DTOS (Core SM-2)
========================= */

export class ReviewResultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiProperty({ enum: CardStatus })
  @IsEnum(CardStatus)
  status: CardStatus;

  @ApiProperty({ description: 'Interval in days' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  interval: number;

  @ApiProperty({ description: 'Number of consecutive successful reviews' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  repetitions: number; // Khớp với Schema: repetitions (số nhiều)

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  easeFactor: number;

  @ApiProperty()
  @IsDateString()
  nextReview: string;

  @ApiPropertyOptional({ description: '1: Again, 2: Hard, 3: Good, 4: Easy' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  rating?: number;
}

export class SyncSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ type: [ReviewResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewResultDto)
  results: ReviewResultDto[];

  @ApiPropertyOptional({ description: 'Actual study time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minutesSpent?: number;
}

/* =========================
   SESSION DTOS
========================= */

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deckId: string;
}
