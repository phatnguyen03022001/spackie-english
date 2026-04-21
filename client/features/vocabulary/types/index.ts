import type { Card, Deck } from "../schemas";

/**
 * ==========================================
 * ENUMS (Khớp với Prisma Schema và Server DTOs)
 * ==========================================
 */

export enum SessionMode {
  DEFAULT = "default",
  ALL = "all",
  HARD = "hard",
  RECENT = "recent",
  PREVIEW = "preview",
}

export enum UserRole {
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  ADMIN = "ADMIN",
}

export enum DifficultyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  EXAM_PREP = "EXAM_PREP",
  COMMUNICATION = "COMMUNICATION",
}

export enum CardStatus {
  NEW = "NEW",
  LEARNING = "LEARNING",
  REVIEW = "REVIEW",
  MASTERED = "MASTERED",
}

/**
 * ==========================================
 * SUB-TYPES (Embedded trong MongoDB) - Khớp với server DefinitionDto và MeaningDto
 * ==========================================
 */
export interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

export interface ReviewResultDto {
  cardId: string;
  rating: number; // bắt buộc
  status?: CardStatus; // optional - khớp với server
  interval?: number; // optional - khớp với server
  repetitions?: number; // optional - khớp với server
  easeFactor?: number; // optional - khớp với server
  nextReview?: string; // optional - khớp với server
}

/**
 * ==========================================
 * CORE ENTITIES (Imported from schemas)
 * ==========================================
 */
export type {
  UserStatsResponse,
  HeatmapData,
  StartSessionResponse,
  DeckAnalyticsResponse,
  ReviewForecastResponse,
  EnrolledDeck,
  DueCountResponse,
  EnrollResponse,
  BulkImportResponse,
  SyncSessionResponse,
  CancelSessionResponse,
} from "../schemas";

/**
 * ==========================================
 * DTOs (Data Transfer Objects) cho API (Imported from schemas)
 * ==========================================
 */
/**
 * ==========================================
 * DTOs (Data Transfer Objects) cho API (Imported from schemas)
 * ==========================================
 */
export type {
  CreateDeckInput,
  CreateCardInput,
  BulkImportInput,
  UpdateCardInput,
  SyncSessionInput,
  StartSessionInput,
  Card,
} from "../schemas";

/**
 * ==========================================
 * TOAST & UI TYPES
 * ==========================================
 */
export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastPayload {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

/**
 * ==========================================
 * SM-2 LOGIC TYPES
 * ==========================================
 */
export interface SM2Result {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: Date;
}

/**
 * ==========================================
 * ADDITIONAL TYPES TO MATCH SERVER DTOs
 * ==========================================
 */
export interface CreateSessionDto {
  deckId: string;
  mode?: SessionMode;
  limit?: number;
  page?: number;
}

export interface SyncSessionDto {
  sessionId: string;
  deckId: string;
  results: ReviewResultDto[];
  minutesSpent?: number;
}

export interface BulkImportResultDto {
  success: boolean;
  addedCount: number;
  failedWords?: { word: string; error: string }[];
  message?: string;
}

export interface DeleteResultDto {
  success: boolean;
  message?: string;
}

export interface EnrollResultDto {
  message: string;
  added: number;
  existing?: number;
}

export interface SuccessDto {
  success: boolean;
}

export interface DueCountDto {
  dueCount: number;
}

export interface StartSessionDto {
  sessionId: string;
  cards: Card[]; // Card type đã được import
}

export interface SyncResultDto {
  success: boolean;
  processed: number;
}

export interface LearningSessionDto {
  id: string;
  userId: string;
  deckId: string;
  startTime: Date;
  endTime?: Date;
  cardsProcessed: number;
  minutesSpent: number;
  rawResults?: Record<string, unknown>;
}

export interface ForecastDto {
  [date: string]: number;
}

export interface HeatmapDto {
  [date: string]: number;
}

export interface DeckAnalyticsDto {
  totalCards: number;
  masteredCards: number;
  progress: number;
}

export interface PaginatedDecksDto {
  items: Deck[]; // Deck type đã được import
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}
