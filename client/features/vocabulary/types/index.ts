import * as z from "zod";
export * from "../schemas";
import * as schemas from "../schemas";

/* =========================
   1. INFERRED TYPES (Từ Zod Schemas)
   ========================= */
export type DeckFormData = z.input<typeof schemas.deckSchema> & {
  isPublic: boolean;
};
export type CardFormData = z.infer<typeof schemas.cardSchema>;
export type SyncReviewData = z.infer<typeof schemas.syncReviewSchema>;

/* =========================
   2. DOMAIN INTERFACES (Cho API Response)
   ========================= */
export enum CardStatus {
  NEW = "NEW",
  LEARNING = "LEARNING",
  REVIEW = "REVIEW",
  LAPSED = "LAPSED",
}

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

export interface Card {
  id: string;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: Meaning[];
  status: CardStatus;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: string;
  deckId?: string;
  lastGrade?: number;
  lastReviewedAt?: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  levelTag?: string;
  createdAt: string;
  _count?: {
    cards: number;
  };
}

export interface ReviewResult {
  cardId: string;
  status: CardStatus;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: string;
  lastGrade: number;
  responseTime?: number;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface ForecastData {
  date: string;
  cardCount: number;
}

// Interface cho các mutation không trả về data (chỉ success/message)
export interface SimpleResponse {
  success: boolean;
  message: string;
}

export interface DashboardStats {
  totalDecks: number;
  totalCards: number;
  cardsToReviewToday: number;
  learningProgress: number;
  // Bổ sung 2 dòng này để khớp với StatsOverview component
  statusStats: Record<CardStatus, number>;
  masteryRate: number;
}

// Cập nhật Deck để hỗ trợ xem chi tiết (Pre-fetch cards)
export interface Deck {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  levelTag?: string;
  createdAt: string; // Thêm dòng này
  updatedAt: string; // Thêm dòng này
  _count?: {
    cards: number;
  };
  cards?: Card[]; // Thêm trường này
}

export interface ReviewSession {
  id: string; // Backend trả về 'id'
  userId: string;
  deckId: string;
  startTime: string;
  cards: Card[];
}

export interface SyncReviewResponse {
  success: boolean;
  xpEarned: number;
  cardsProcessed: number;
  sessionId?: string;
}
