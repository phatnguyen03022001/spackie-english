import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios-client";
import { vocabKeys } from "./use-query-keys";
import { UserStatsResponseSchema, HeatmapDataSchema, ReviewForecastResponseSchema } from "../schemas";

// #21 Dashboard Stats (Tổng quan toàn bộ hệ thống của User)
export const useUserStats = () =>
  useQuery({
    queryKey: vocabKeys.stats(),
    queryFn: async () => {
      const res = await api.get("/vocab/dashboard/stats");
      // Đảm bảo data trả về khớp với UserStatsResponseSchema (learnedWords, masteredWords, streak,...)
      return UserStatsResponseSchema.parse(res.data.data);
    },
    staleTime: 1000 * 60 * 5, // 5 phút
  });

// #23 Heatmap (Dữ liệu biểu đồ nhiệt học tập)
export const useHeatmap = () =>
  useQuery({
    queryKey: vocabKeys.heatmap(),
    queryFn: async () => {
      const res = await api.get("/vocab/dashboard/heatmap");
      return HeatmapDataSchema.parse(res.data.data); // không dùng array
    },
  });

// #22 Review Forecast (Dự báo số lượng thẻ cần ôn trong tương lai)
export const useReviewForecast = () =>
  useQuery({
    queryKey: vocabKeys.forecast(),
    queryFn: async () => {
      const res = await api.get("/vocab/reviews/forecast");
      return ReviewForecastResponseSchema.parse(res.data.data);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
