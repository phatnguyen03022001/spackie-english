import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { z } from "zod";
import { toast } from "sonner";
import api from "@/lib/axios-client";
import { vocabKeys } from "./use-query-keys";
import {
  CreateDeckInput,
  CreateCardInput,
  UpdateCardInput,
  DeckSchema,
  CardSchema,
  BulkImportResponseSchema,
  DeckAnalyticsResponseSchema,
} from "../schemas";

interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

// --- QUERIES ---

export const useMyDecks = () =>
  useQuery({
    queryKey: vocabKeys.decks(),
    queryFn: async () => {
      const res = await api.get("/management/vocab/decks");
      const data = res.data?.data;
      return z.array(DeckSchema).parse(Array.isArray(data) ? data : []);
    },
    staleTime: 1000 * 60 * 5,
  });

export const useDeckDetails = (id: string) =>
  useQuery({
    queryKey: vocabKeys.deck(id),
    queryFn: async () => {
      const res = await api.get(`/management/vocab/decks/${id}`);
      return DeckSchema.extend({
        cards: z.array(CardSchema),
      }).parse(res.data.data);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const useDeckAnalytics = (id: string) =>
  useQuery({
    queryKey: vocabKeys.analytics(id),
    queryFn: async () => {
      const res = await api.get(`/management/vocab/decks/${id}/analytics`);
      return DeckAnalyticsResponseSchema.parse(res.data.data);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // Analytics ít thay đổi, để cache lâu hơn
  });

// --- MUTATIONS ---

export const useCreateDeck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDeckInput) => {
      const res = await api.post("/management/vocab/decks", data);
      return DeckSchema.parse(res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.decks() });
      toast.success("Tạo bộ thẻ thành công");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Không thể tạo bộ thẻ");
    },
  });
};

export const useUpdateDeck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateDeckInput }) => {
      const res = await api.patch(`/management/vocab/decks/${id}`, data);
      return DeckSchema.parse(res.data.data);
    },
    onSuccess: (updatedDeck) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.decks() });
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(updatedDeck.id) });
      toast.success("Cập nhật thông tin thành công");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    },
  });
};

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/management/vocab/decks/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.decks() });
      queryClient.removeQueries({ queryKey: vocabKeys.deck(id) });
      toast.success("Xóa bộ thẻ thành công");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    },
  });
};

export const useTogglePublicStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await api.patch(`/management/vocab/decks/${id}/status`, { isPublic });
      return DeckSchema.parse(res.data.data);
    },
    onSuccess: (updatedDeck) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.decks() });
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(updatedDeck.id) });
      toast.success(updatedDeck.isPublic ? "Đã công khai bộ thẻ" : "Đã chuyển sang riêng tư");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Không thể thay đổi trạng thái");
    },
  });
};

export const useAddCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deckId, data }: { deckId: string; data: CreateCardInput }) => {
      const res = await api.post(`/management/vocab/decks/${deckId}/cards`, data);
      return CardSchema.parse(res.data.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(variables.deckId) });
      toast.success("Đã thêm từ mới");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Không thể thêm thẻ");
    },
  });
};

export const useBulkImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deckId, words }: { deckId: string; words: string[] }) => {
      const res = await api.post(`/management/vocab/decks/${deckId}/cards/auto-bulk`, { words });
      return BulkImportResponseSchema.parse(res.data.data);
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(variables.deckId) });
      toast.success(`Đã nhập thành công ${res.addedCount} từ vựng!`);
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Lỗi khi nhập liệu AI");
    },
  });
};

export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, data }: { cardId: string; deckId: string; data: UpdateCardInput }) => {
      const res = await api.patch(`/management/vocab/cards/${cardId}`, data);
      return CardSchema.parse(res.data.data);
    },
    onSuccess: (data, variables) => {
      // variables ở đây chính là { cardId, deckId, data }
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(variables.deckId) });
      toast.success("Cập nhật thẻ thành công");
    },
  });
};

export const useDeleteCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, deckId }: { cardId: string; deckId: string }) => {
      await api.delete(`/management/vocab/cards/${cardId}`);
      return { cardId, deckId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.deck(variables.deckId) });
      toast.success("Xóa thẻ thành công");
    },
  });
};
