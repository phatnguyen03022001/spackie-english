// import { z } from "zod";

/**
 * ==========================================
 * ENUMS (Khớp với Prisma Schema)
 * ==========================================
 */

export enum StudyMode {
  ALL = "all",
  HARD = "hard",
  RECENT = "recent",
  PREVIEW = "preview",
  DEFAULT = "default",
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
 * SUB-TYPES (Embedded trong MongoDB)
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
  status?: CardStatus; // optional
  interval?: number; // optional
  repetitions?: number; // optional
  easeFactor?: number; // optional
  nextReview?: string; // optional
}
/**
 * ==========================================
 * CORE ENTITIES (Imported from schemas)
 * ==========================================
 */
export type {
  Deck,
  Card,
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
export type {
  CreateDeckInput,
  CreateCardInput,
  BulkImportInput,
  UpdateCardInput,
  SyncSessionInput,
  StartSessionInput,
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
