import { z } from "zod";
import { DifficultyLevel, CardStatus } from "../types";

/**
 * ==========================================
 * SHARED SCHEMAS
 * ==========================================
 */

const DateTimeSchema = z.coerce.date().refine((d) => !isNaN(d.getTime()), {
  message: "Invalid date",
});

const DefinitionBaseSchema = z
  .object({
    definition: z.string(),
    example: z.preprocess((val) => (val === null ? undefined : val), z.string().optional()),
    synonyms: z.preprocess((val) => (val === null ? [] : val), z.array(z.string()).default([])),
    antonyms: z.preprocess((val) => (val === null ? [] : val), z.array(z.string()).default([])),
  })
  .passthrough();

export const MeaningBaseSchema = z
  .object({
    partOfSpeech: z.string().min(1, "Part of speech is required"),
    definitions: z.array(DefinitionBaseSchema).min(1),
  })
  .strict();

/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */

// Deck Response Schema

const UserPreviewSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export const DeckSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    isPublic: z.boolean(),
    levelTag: z.nativeEnum(DifficultyLevel),
    creatorId: z.string(),
    creator: UserPreviewSchema.optional(), // 👈 thêm creator
    isEnrolled: z.boolean().optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema.nullable().optional(),
    _count: z.object({ cards: z.number() }).optional(),
  })
  .passthrough();

export const PublicDecksResponseSchema = z
  .object({
    items: z.array(DeckSchema),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      lastPage: z.number(),
    }),
  })
  .passthrough();

const NullableUrl = z.string().url().nullable().catch(null);

// Word Schema
export const WordSchema = z
  .object({
    id: z.string(),
    word: z.string(),
    phonetic: z.preprocess((val) => (val === null ? undefined : val), z.string().optional()),
    audioUrl: NullableUrl,
    meanings: z.array(MeaningBaseSchema),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema.optional(),
  })
  .passthrough();

// Card Schema (with relation to Word)
export const CardSchema = z
  .object({
    id: z.string(),
    wordId: z.string(),
    word: WordSchema.optional(), // populated khi get chi tiết
    userId: z.string(),
    deckId: z.string().nullable().default(null),
    status: z.nativeEnum(CardStatus),
    easeFactor: z.number(),
    interval: z.number(),
    repetitions: z.number(),
    nextReview: DateTimeSchema,
    lastRating: z.number().optional().nullable(),
    lastReviewedAt: DateTimeSchema.optional().nullable(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema.optional(),
  })
  .passthrough();

// User Stats Response Schema
export const UserStatsResponseSchema = z
  .object({
    id: z.string().optional(), // backend không trả
    totalWords: z.number(),
    learnedWords: z.number(),
    masteredWords: z.number(),
    totalReviews: z.number(),
    lastStudyDate: DateTimeSchema.nullable().optional(), // backend không trả
    masteryRate: z.number().optional(), // backend có trả
  })
  .passthrough(); // cho phép nhận thêm trường lạ

// Heatmap Data Schema
const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const HeatmapDataSchema = z.record(DateKey, z.number().int().nonnegative());

// Start Session Response Schema
export const StartSessionResponseSchema = z.object({
  sessionId: z.string(),
  cards: z.array(CardSchema),
});

export const DeckPreviewSchema = DeckSchema.extend({
  cards: z
    .array(
      z.object({
        id: z.string(),
        word: z.string(),
        phonetic: z.string().optional(),
        meanings: z.array(MeaningBaseSchema),
      }),
    )
    .max(10),
});

// Deck Analytics Response Schema
export const DeckAnalyticsResponseSchema = z.object({
  totalCards: z.number(),
  masteredCards: z.number(),
  progress: z.number(),
});

// Review Forecast Response Schema
export const ReviewForecastResponseSchema = z.record(z.string(), z.number());

// Enrolled Decks Response Schema
export const EnrolledDeckSchema = DeckSchema.extend({
  cardCount: z.number(),
  masteredCount: z.number(),
  dueCount: z.number(),
});

// Due Count Response Schema
export const DueCountResponseSchema = z.object({
  dueCount: z.number(),
});

// Enroll Response Schema
export const EnrollResponseSchema = z.object({
  message: z.string(),
  added: z.number(),
});

// Bulk Import Response Schema
export const BulkImportResponseSchema = z.object({
  success: z.boolean(),
  addedCount: z.number(),
});

// Sync Session Response Schema
export const SyncSessionResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
});

// Cancel Session Response Schema
export const CancelSessionResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * ==========================================
 * MANAGEMENT SCHEMAS (Teacher/Admin)
 * ==========================================
 */

// API #1: Create Deck
export const CreateDeckSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional(),
  isPublic: z.boolean(),
  levelTag: z.nativeEnum(DifficultyLevel),
});

// API #7: Add Card (tạo word mới và card)
export const CreateCardSchema = z.object({
  word: z.string().min(1, "Word is required"),
  phonetic: z.preprocess((val) => (val === null ? undefined : val), z.string().optional()),
  audioUrl: NullableUrl,
  meanings: z.array(MeaningBaseSchema).min(1),
});

// API #8: Bulk Import
export const BulkImportSchema = z.object({
  words: z.array(z.string().min(1)).min(1, "Please provide at least one word").max(30, "Maximum 30 words per import"),
});

// API #9: Update Card (chỉ cho phép cập nhật deckId và status)
export const UpdateCardSchema = z.object({
  deckId: z.string().nullable().optional(),
  status: z.nativeEnum(CardStatus).optional(),
});

/**
 * ==========================================
 * LEARNING & SESSION SCHEMAS
 * ==========================================
 */

// API #18: Start Session
export const StartSessionSchema = z.object({
  deckId: z.string().min(1, "Deck ID is required"),
  mode: z.enum(["all", "hard", "recent", "preview", "default"]).optional(),
});

// API #19: Sync Session (chỉ yêu cầu cardId và rating)
export const ReviewResultSchema = z
  .object({
    cardId: z.string().min(1),
    rating: z.number().min(1).max(4),
    status: z.nativeEnum(CardStatus), // bắt buộc
    interval: z.number().nonnegative(), // bắt buộc
    repetitions: z.number().nonnegative(), // bắt buộc
    easeFactor: z.number().min(1.3).max(3.0), // bắt buộc
    nextReview: DateTimeSchema, // bắt buộc
  })
  .strict();

export const SyncSessionSchema = z.object({
  sessionId: z.string().min(1),
  deckId: z.string().min(1),
  results: z.array(ReviewResultSchema),
  minutesSpent: z.number().default(0),
});

export const ApiResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .object({
      success: z.boolean(),
      statusCode: z.number(),
      message: z.string(),
      data: schema.nullable(),
      timestamp: z.string().datetime(),
    })
    .passthrough();

/**
 * ==========================================
 * TYPES INFERRED FROM SCHEMAS
 * ==========================================
 */
export type CreateDeckInput = z.infer<typeof CreateDeckSchema>;
export type CreateCardInput = z.infer<typeof CreateCardSchema>;
export type BulkImportInput = z.infer<typeof BulkImportSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
export type SyncSessionInput = z.infer<typeof SyncSessionSchema>;
export type StartSessionInput = z.infer<typeof StartSessionSchema>;

// Response Types
export type Deck = z.infer<typeof DeckSchema>;
export type Word = z.infer<typeof WordSchema>;
export type Card = z.infer<typeof CardSchema>;
export type UserStatsResponse = z.infer<typeof UserStatsResponseSchema>;
export type HeatmapData = z.infer<typeof HeatmapDataSchema>;
export type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;
export type DeckAnalyticsResponse = z.infer<typeof DeckAnalyticsResponseSchema>;
export type ReviewForecastResponse = z.infer<typeof ReviewForecastResponseSchema>;
export type EnrolledDeck = z.infer<typeof EnrolledDeckSchema>;
export type DueCountResponse = z.infer<typeof DueCountResponseSchema>;
export type EnrollResponse = z.infer<typeof EnrollResponseSchema>;
export type BulkImportResponse = z.infer<typeof BulkImportResponseSchema>;
export type SyncSessionResponse = z.infer<typeof SyncSessionResponseSchema>;
export type CancelSessionResponse = z.infer<typeof CancelSessionResponseSchema>;
