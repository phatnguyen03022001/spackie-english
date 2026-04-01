import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/lib/axios-client";
import { vocabKeys } from "./use-query-keys";
import {
  SyncSessionSchema,
  SyncSessionInput,
  StartSessionResponseSchema,
  CancelSessionResponseSchema,
  StartSessionInput,
} from "../schemas";
import { CardStatus } from "../types";

interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

// ✅ Export lẻ từng Mutation Hook
export const useStartSession = () => {
  return useMutation({
    mutationFn: async (data: StartSessionInput) => {
      const res = await api.post("/vocab/reviews/session/start", data);
      return StartSessionResponseSchema.parse(res.data.data);
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Không thể bắt đầu phiên học");
    },
  });
};

export const useSyncSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SyncSessionInput) => {
      const enrichedData = {
        ...data,
        results: data.results.map((result) => ({
          ...result,
          status: result.status ?? CardStatus.NEW,
          interval: result.interval ?? 0,
          repetitions: result.repetitions ?? 0,
          easeFactor: result.easeFactor ?? 2.5,
          nextReview: result.nextReview ?? new Date().toISOString(),
        })),
      };
      console.log("Sending sync data:", enrichedData); // Log để debug
      const validated = SyncSessionSchema.parse(enrichedData);
      const res = await api.post("/vocab/reviews/session/sync", validated);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vocabKeys.all });
      queryClient.removeQueries({ queryKey: vocabKeys.sessions() });
      toast.success("Đã đồng bộ kết quả học tập!");
    },
    onError: (error: AxiosError<ApiError>) => {
      console.error("Sync error response:", error.response?.data); // Log chi tiết lỗi
      toast.error(error.response?.data?.message || "Không thể đồng bộ dữ liệu");
    },
  });
};

export const useCancelSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.patch(`/vocab/reviews/session/${sessionId}/cancel`);
      return CancelSessionResponseSchema.parse(res.data.data);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: vocabKeys.sessions() });
      toast.success("Đã hủy phiên học");
    },
    onError: (error: AxiosError<ApiError>) => {
      toast.error(error.response?.data?.message || "Lỗi khi hủy phiên học");
    },
  });
};
