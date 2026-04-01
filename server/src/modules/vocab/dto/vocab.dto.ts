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
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardStatus, DifficultyLevel } from '@prisma/client';

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
   WORD DTOS (Kho từ vựng chung)
========================= */

export class CreateWordDto {
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

export class UpdateWordDto extends PartialType(CreateWordDto) {}

export class WordResponseDto extends CreateWordDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
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

  @ApiPropertyOptional({
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
    example: DifficultyLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  levelTag?: DifficultyLevel = DifficultyLevel.BEGINNER;
}

export class UpdateDeckDto extends PartialType(CreateDeckDto) {}

/* =========================
   CARD DTOS
========================= */

export class CreateCardWithNewWordDto extends CreateWordDto {
  @ApiPropertyOptional({ description: 'Deck ID to add the card to' })
  @IsOptional()
  @IsMongoId()
  deckId?: string;
}

export class CreateCardWithWordIdDto {
  @ApiProperty({ description: 'ID of existing word' })
  @IsMongoId()
  wordId: string;

  @ApiPropertyOptional({ description: 'Deck ID to add the card to' })
  @IsOptional()
  @IsMongoId()
  deckId?: string;
}

export class BulkCreateCardsDto {
  @ApiProperty({ type: [String], example: ['apple', 'banana'], maxItems: 30 })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @IsNotEmpty({ each: true })
  words: string[];
}

export class UpdateCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  deckId?: string;

  @ApiPropertyOptional({ enum: CardStatus })
  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;
}

/* =========================
   REVIEW & SYNC DTOS (Core SM-2)
========================= */

export class ReviewResultDto {
  @IsMongoId()
  cardId: string;

  @IsNumber()
  @Min(1)
  @Max(4)
  rating: number;

  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interval?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  repetitions?: number;

  @IsOptional()
  @IsNumber()
  easeFactor?: number;

  @IsOptional()
  @IsDateString()
  nextReview?: string;
}

export class SyncSessionDto {
  @ApiProperty({ description: 'Session ID (from client)' })
  @IsMongoId()
  sessionId: string;

  @ApiProperty()
  @IsMongoId()
  deckId: string;

  @ApiProperty({ type: [ReviewResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewResultDto)
  results: ReviewResultDto[];

  @ApiPropertyOptional({ description: 'Actual study time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  minutesSpent?: number;
}

/* =========================
   SESSION DTOS
========================= */
export enum SessionMode {
  DEFAULT = 'default',
  ALL = 'all',
  HARD = 'hard',
  RECENT = 'recent',
  PREVIEW = 'preview',
}

export class CreateSessionDto {
  @ApiProperty()
  @IsMongoId()
  deckId: string;

  @ApiPropertyOptional({ enum: SessionMode, default: SessionMode.DEFAULT })
  @IsOptional()
  @IsEnum(SessionMode)
  mode?: SessionMode = SessionMode.DEFAULT;

  @ApiPropertyOptional({
    description: 'Max cards per session, max 100',
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Page for pagination, 1-indexed',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;
}

/* =========================
   RESPONSE DTOS (cho client)
========================= */

export class CardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  wordId: string;

  @ApiProperty()
  word: WordResponseDto;

  @ApiPropertyOptional()
  deckId?: string;

  @ApiProperty({ enum: CardStatus })
  status: CardStatus;

  @ApiProperty()
  easeFactor: number;

  @ApiProperty()
  interval: number;

  @ApiProperty()
  repetitions: number;

  @ApiProperty()
  nextReview: Date;

  @ApiPropertyOptional()
  lastRating?: number;

  @ApiPropertyOptional()
  lastReviewedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class DeckResponseDto extends CreateDeckDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  @ApiPropertyOptional({ type: [CardResponseDto] })
  cards?: CardResponseDto[];

  @ApiPropertyOptional()
  _count?: { cards: number };

  @ApiPropertyOptional({
    type: Object,
    example: { totalCards: 123, page: 1, lastPage: 13 },
  })
  meta?: {
    totalCards: number;
    page: number;
    lastPage: number;
  };
}

export class UserStatsResponseDto {
  @ApiProperty()
  totalWords: number;

  @ApiProperty()
  learnedWords: number;

  @ApiProperty()
  masteredWords: number;

  @ApiProperty()
  totalReviews: number;

  @ApiPropertyOptional()
  lastStudyDate?: Date;
}

/* =========================
   BỔ SUNG CÁC DTO RESPONSE ĐẶC THÙ
========================= */

export class BulkImportResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  addedCount: number;

  @ApiPropertyOptional({
    type: [Object],
    example: [{ word: 'abc', error: 'Not found in dictionary' }],
  })
  failedWords?: { word: string; error: string }[];
  message?: string;
}

export class DeleteResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  message?: string;
}

export class EnrollResultDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  added: number;

  @ApiPropertyOptional()
  existing?: number; // số từ đã tồn tại, không thay đổi deck
}

export class SuccessDto {
  @ApiProperty()
  success: boolean;
}

export class DueCountDto {
  @ApiProperty()
  dueCount: number;
}

export class StartSessionDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty({ type: [CardResponseDto] })
  cards: CardResponseDto[];
}

export class SyncResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  processed: number;
}

export class LearningSessionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  deckId: string;

  @ApiProperty()
  startTime: Date;

  @ApiPropertyOptional()
  endTime?: Date;

  @ApiProperty()
  cardsProcessed: number;

  @ApiProperty()
  minutesSpent: number;

  @ApiPropertyOptional()
  rawResults?: any;
}

export class ForecastDto {
  [date: string]: number;
}

export class HeatmapDto {
  [date: string]: number;
}

export class DeckAnalyticsDto {
  @ApiProperty()
  totalCards: number;

  @ApiProperty()
  masteredCards: number;

  @ApiProperty()
  progress: number;
}

export class PaginatedDecksDto {
  @ApiProperty({ type: [DeckResponseDto] })
  items: DeckResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}
