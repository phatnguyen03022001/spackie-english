import { useCallback } from "react";
import { Card, ReviewResultDto } from "../types";
import { calculateSM2, determineCardStatus } from "../utils/srs-logic";

export function useSm2Logic() {
  /**
   * Chuyển đổi một tương tác của người dùng thành kết quả Sync API
   */
  const processCardReview = useCallback((card: Card, rating: number): ReviewResultDto => {
    // Gọi pure function để tính toán thông số SRS
    const { interval, easeFactor, repetitions, nextReview } = calculateSM2(
      {
        interval: card.interval,
        easeFactor: card.easeFactor,
        repetitions: card.repetitions,
      },
      rating,
    );

    // Xác định status dựa trên độ giãn cách (Interval)
    const newStatus = determineCardStatus(interval);

    return {
      cardId: card.id,
      status: newStatus,
      interval: interval,
      repetitions: repetitions,
      easeFactor: Number(easeFactor.toFixed(2)), // Làm tròn để DB đẹp hơn
      rating: rating,
      nextReview: nextReview.toISOString(),
    };
  }, []);

  return {
    processCardReview,
  };
}
