import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, ReviewResult, SyncReviewData } from "../types";
import { calculateSM2 } from "../utils/srs-logic";

export const useVocabReview = (initialCards: Card[], sessionId?: string) => {
  const [queue, setQueue] = useState<Card[]>(initialCards);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(() => Date.now());

  // CHỈNH SỬA: Chuyển từ useRef sang useState để UI cập nhật được trạng thái nút bấm
  const [isProcessing, setIsProcessing] = useState(false);

  const currentCard = useMemo(() => queue[currentIndex] || null, [queue, currentIndex]);

  const handleAnswer = useCallback(
    (quality: number) => {
      // Chặn nếu đang xử lý hoặc hết thẻ
      if (isProcessing || !currentCard) return;

      // Khóa UI ngay lập tức
      setIsProcessing(true);

      const now = Date.now();
      const responseTime = now - cardStartTime;

      const newStats = calculateSM2(
        quality,
        currentCard.interval || 0,
        currentCard.repetition || 0,
        currentCard.easeFactor || 2.5,
      );

      const result: ReviewResult = {
        cardId: currentCard.id,
        status: newStats.status,
        interval: newStats.interval,
        repetition: newStats.repetition,
        easeFactor: newStats.easeFactor,
        nextReview: newStats.nextReview,
        lastGrade: quality,
        responseTime,
      };

      setResults((prev) => {
        const filtered = prev.filter((r) => r.cardId !== currentCard.id);
        return [...filtered, result];
      });

      if (quality === 1) {
        setQueue((prev) => [...prev, currentCard]);
      }

      setCurrentIndex((prev) => prev + 1);
      setCardStartTime(Date.now());

      // Mở khóa sau 300ms (khớp với animation lật thẻ)
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    },
    [currentCard, cardStartTime, isProcessing], // Thêm isProcessing vào dependency
  );

  const completedCount = useMemo(() => {
    const finishedIds = new Set(results.filter((r) => r.lastGrade > 1).map((r) => r.cardId));
    return finishedIds.size;
  }, [results]);

  const progress = useMemo(() => {
    if (initialCards.length === 0) return 0;
    return Math.min(Math.round((completedCount / initialCards.length) * 100), 100);
  }, [completedCount, initialCards.length]);

  const getSyncData = useCallback(
    (): SyncReviewData => ({
      sessionId,
      results,
    }),
    [results, sessionId],
  );

  const resetSession = useCallback((newCards: Card[]) => {
    setQueue(newCards);
    setResults([]);
    setCurrentIndex(0);
    setCardStartTime(Date.now());
    setIsProcessing(false);
  }, []);

  return {
    currentCard,
    currentIndex,
    totalInQueue: queue.length,
    progress,
    isFinished: currentIndex >= queue.length && queue.length > 0,
    handleAnswer,
    getSyncData,
    resetSession,
    // Trả về state trực tiếp, an toàn cho render
    isProcessing,
  };
};

export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
