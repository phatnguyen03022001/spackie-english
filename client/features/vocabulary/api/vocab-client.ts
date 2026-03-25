import apiClient from "@/lib/axios";
import {
  DeckFormData,
  CardFormData,
  SyncReviewData,
  Deck,
  Card,
  DashboardStats,
  HeatmapData,
  ForecastData,
  SimpleResponse,
  ReviewSession,
  SyncReviewResponse,
} from "../types/index";

// Định nghĩa Wrapper chuẩn từ NestJS
interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export const vocabApi = {
  /* ============================================================
     STUDENT & LEARNING
     ============================================================ */

  getPublicDecks: async (search?: string, tag?: string) => {
    const res = await apiClient.get<ApiResponse<Deck[]>>("/vocab/decks/public", { params: { search, tag } });
    return res.data.data;
  },

  getDeckPreview: async (id: string) => {
    // Backend trả về thẳng object Deck, trong đó có field cards
    const res = await apiClient.get<ApiResponse<Deck & { cards: Card[] }>>(`/vocab/decks/${id}/preview`);
    return res.data.data;
  },

  getRecommendedDecks: async () => {
    const res = await apiClient.get<ApiResponse<Deck[]>>("/vocab/decks/recommend");
    return res.data.data;
  },

  enrollDeck: async (id: string) => {
    const res = await apiClient.post<ApiResponse<SimpleResponse>>(`/vocab/decks/${id}/enroll`);
    return res.data.data;
  },

  unenrollDeck: async (id: string) => {
    const res = await apiClient.delete<ApiResponse<SimpleResponse>>(`/vocab/decks/${id}/unenroll`);
    return res.data.data;
  },

  getMyEnrolledDecks: async () => {
    const res = await apiClient.get<ApiResponse<Deck[]>>("/vocab/decks/enrolled");
    return res.data.data;
  },

  getTodayCards: async () => {
    const res = await apiClient.get<ApiResponse<Card[]>>("/vocab/reviews/today");
    return res.data.data;
  },

  // Sửa lại đoạn này
  startSession: async (deckId?: string): Promise<ReviewSession> => {
    const res = await apiClient.post<ApiResponse<ReviewSession>>("/vocab/reviews/session/start", { deckId });
    return res.data.data;
  },
  syncReviews: async (data: SyncReviewData): Promise<SyncReviewResponse> => {
    const res = await apiClient.post<ApiResponse<SyncReviewResponse>>("/vocab/reviews/sync", data);
    return res.data.data;
  },

  undoLastReview: async () => {
    const res = await apiClient.post<ApiResponse<SimpleResponse>>("/vocab/reviews/undo");
    return res.data.data;
  },

  getDashboardStats: async () => {
    const res = await apiClient.get<ApiResponse<DashboardStats>>("/vocab/dashboard/stats");
    return res.data.data;
  },

  getHeatmap: async () => {
    const res = await apiClient.get<ApiResponse<HeatmapData[]>>("/vocab/dashboard/heatmap");
    return res.data.data;
  },

  getForecast: async () => {
    const res = await apiClient.get<ApiResponse<ForecastData[]>>("/vocab/reviews/forecast");
    return res.data.data;
  },

  /* ============================================================
     TEACHER & CONTENT MANAGEMENT
     ============================================================ */

  createDeck: async (data: DeckFormData) => {
    const res = await apiClient.post<ApiResponse<Deck>>("/management/vocab/decks", data);
    return res.data.data;
  },

  getTeacherDecks: async () => {
    const res = await apiClient.get<ApiResponse<Deck[]>>("/management/vocab/decks");
    return res.data.data;
  },

  getDeckDetail: async (id: string) => {
    // Thường trả về Deck & { cards: Card[] }
    const res = await apiClient.get<ApiResponse<Deck & { cards: Card[] }>>(`/management/vocab/decks/${id}`);
    return res.data.data;
  },

  updateDeck: async (id: string, data: Partial<DeckFormData>) => {
    const res = await apiClient.patch<ApiResponse<Deck>>(`/management/vocab/decks/${id}`, data);
    return res.data.data;
  },

  deleteDeck: async (id: string) => {
    const res = await apiClient.delete<ApiResponse<SimpleResponse>>(`/management/vocab/decks/${id}`);
    return res.data.data;
  },

  addCard: async (deckId: string, data: CardFormData) => {
    const res = await apiClient.post<ApiResponse<Card>>(`/management/vocab/decks/${deckId}/cards`, data);
    return res.data.data;
  },

  bulkImportCards: async (deckId: string, words: string[]) => {
    const res = await apiClient.post<ApiResponse<Card[]>>(`/management/vocab/decks/${deckId}/cards/auto-bulk`, {
      words,
    });
    return res.data.data;
  },

  updateCard: async (cardId: string, data: Partial<CardFormData>) => {
    const res = await apiClient.patch<ApiResponse<Card>>(`/management/vocab/cards/${cardId}`, data);
    return res.data.data;
  },

  deleteCard: async (cardId: string) => {
    const res = await apiClient.delete<ApiResponse<SimpleResponse>>(`/management/vocab/cards/${cardId}`);
    return res.data.data;
  },

  moderateDeck: async (id: string, isPublic: boolean) => {
    const res = await apiClient.patch<ApiResponse<SimpleResponse>>(`/management/vocab/decks/${id}/status`, {
      isPublic,
    });
    return res.data.data;
  },
};
