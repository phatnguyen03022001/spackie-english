import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AxiosError } from "axios";
import { z } from "zod";
import api from "@/lib/axios-client";
import { vocabKeys } from "./use-query-keys";
import {
  DeckSchema,
  EnrollResponseSchema,
  EnrolledDeckSchema,
  DueCountResponseSchema,
  PublicDecksResponseSchema,
  EnrolledDeck,
  WordSchema,
} from "../schemas";
import { toast } from "sonner";

interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}
interface PublicDecksParams {
  search?: string;
  level?: string;
  page?: number;
  limit?: number;
}

export const usePublicDecks = (
  params?: PublicDecksParams, // <-- Thêm params ở đây
) =>
  useQuery({
    // 2. CẬP NHẬT Query Key: Phải bao gồm params để React Query tự động refetch khi filter thay đổi
    queryKey: [...vocabKeys.public(), { search: params?.search, level: params?.level, page: params?.page }],

    queryFn: async () => {
      // 3. Gửi params lên server qua Axios/API
      const res = await api.get("/vocab/decks/public", {
        params: {
          search: params?.search,
          tag: params?.level === "all" ? undefined : params?.level,
          page: params?.page,
          // limit: params?.limit // nếu có
        },
      });

      const raw = res.data?.data ?? {};

      return PublicDecksResponseSchema.parse({
        items: Array.isArray(raw.items) ? raw.items : [],
        meta: raw.meta ?? { total: 0, page: 1, lastPage: 1 },
      });
    },
    // Giúp UI không bị giật (nháy trắng) khi đang chuyển trang hoặc đổi filter
    placeholderData: (previousData) => previousData,
  });

export interface DeckPreviewParams {
  limit?: number;
  page?: number;
}

/**
 * Get deck preview with pagination support
 * @param id - Deck ID
 * @param params - Pagination parameters (limit, page)
 * @returns Deck preview with paginated cards
 */
export const useDeckPreview = (id: string, params?: DeckPreviewParams) =>
  useQuery({
    queryKey: vocabKeys.preview(id),
    queryFn: async () => {
      const res = await api.get(`/vocab/decks/${id}/preview`, {
        params: {
          limit: params?.limit || 50,
          page: params?.page || 1,
        },
      });
      try {
        return DeckSchema.extend({
          cards: z.array(
            z.object({
              id: z.string(),
              word: WordSchema,
            }),
          ),
          meta: z
            .object({
              totalCards: z.number(),
              page: z.number(),
              lastPage: z.number(),
            })
            .optional(),
        }).parse(res.data.data);
      } catch (err) {
        console.error("Parse error in useDeckPreview:", err);
        throw err;
      }
    },
    enabled: !!id,
  });

export const useEnrollDeck = () => {
  const queryClient = useQueryClient();
  // Không dùng router ở đây nữa

  return useMutation({
    mutationFn: async (deckId: string) => {
      const res = await api.post(`/vocab/decks/${deckId}/enroll`);
      return EnrollResponseSchema.parse(res.data.data);
    },
    onSuccess: (_, deckId) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.enrolled() });
      queryClient.invalidateQueries({ queryKey: vocabKeys.dueCount() });
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(deckId) });
      queryClient.invalidateQueries({ queryKey: vocabKeys.preview(deckId) });
      queryClient.invalidateQueries({ queryKey: vocabKeys.public() });
      toast.success("Đăng ký thành công! Bắt đầu học ngay nhé.");
      // Không push router ở đây nữa
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Đăng ký thất bại");
    },
  });
};
export const useUnenrollDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const res = await api.delete(`/vocab/decks/${deckId}/unenroll`);
      return res.data.data;
    },
    onSuccess: (_, deckId) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.enrolled() });
      queryClient.invalidateQueries({ queryKey: vocabKeys.dueCount() });
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(deckId) });
      queryClient.invalidateQueries({ queryKey: vocabKeys.preview(deckId) });
      queryClient.invalidateQueries({ queryKey: vocabKeys.public() });
      toast.success("Hủy đăng ký thành công");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Hủy đăng ký thất bại");
    },
  });
};

export const useEnrolledDecks = () =>
  useQuery({
    queryKey: vocabKeys.enrolled(),
    queryFn: async () => {
      const res = await api.get("/vocab/decks/enrolled");
      const rawData = res.data?.data;

      if (!Array.isArray(rawData)) return [];

      // Transform dữ liệu thô từ NestJS sang EnrolledDeck (Zod style)
      const transformed: EnrolledDeck[] = rawData.map((deck) => ({
        ...deck,
        // Map _count.cards từ Prisma thành cardCount cho Schema
        cardCount: deck.cardCount ?? deck._count?.cards ?? 0,
        masteredCount: deck.masteredCount ?? 0,
        dueCount: deck.dueCount ?? 0,
      }));

      return z.array(EnrolledDeckSchema).parse(transformed);
    },
  });

export const useDueCount = () =>
  useQuery({
    queryKey: vocabKeys.dueCount(),
    queryFn: async () => {
      const res = await api.get("/vocab/reviews/today-count");
      return DueCountResponseSchema.parse(res.data.data);
    },
    refetchInterval: 1000 * 60 * 5,
  });
