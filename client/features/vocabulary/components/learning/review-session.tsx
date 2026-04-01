"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";

// API & Types
import { useStartSession, useSyncSession, useCancelSession } from "../../api/use-learning";
import { calculateSM2 } from "../../utils/srs-logic";
import { ReviewResultSchema } from "../../schemas";
import { Card } from "../../schemas";
import { CardStatus } from "../../types";
import type { z } from "zod";

type ReviewResult = z.infer<typeof ReviewResultSchema>;

// Components
import { ReviewCard } from "./review-card";
import { ReviewProgress } from "./review-progress";
import { ReviewActions } from "./review-actions";
import { SessionComplete } from "./session-complete";
import { Button } from "@/components/ui/button";

// Sửa lại interface để khớp với page.tsx
interface ReviewSessionProps {
  deckId: string;
  studyMode?: "all" | "hard" | "recent" | "preview" | "default";
}

export const ReviewSession = ({ deckId, studyMode }: ReviewSessionProps) => {
  const router = useRouter();

  // --- API Hooks ---
  const { mutate: startSession, isPending: isStarting, isSuccess: isStarted } = useStartSession();
  const { mutate: syncSession, isPending: isSyncing } = useSyncSession();
  const { mutate: cancelSession } = useCancelSession();

  // --- States ---
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]); // Sử dụng ReviewResult từ schema

  // Refs quản lý session
  const startTimeRef = useRef<Date>(new Date());
  const isFinishedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const currentCard = sessionCards[currentIndex];
  const totalCards = sessionCards.length;

  /**
   * Cải thiện hàm determineStatus:
   * logic này nên dựa trên ngưỡng của thuật toán SM-2 bạn đã cài đặt
   */
  const determineStatus = (rating: number, interval: number, repetitions: number): CardStatus => {
    if (rating < 3) return CardStatus.LEARNING;
    if (interval >= 21 || repetitions >= 8) return CardStatus.MASTERED;
    if (interval > 3) return CardStatus.REVIEW;
    return CardStatus.LEARNING;
  };

  // --- 1. Khởi tạo Session ---
  useEffect(() => {
    let isMounted = true;

    startSession(
      { deckId, mode: studyMode }, // Mode được truyền xuống từ URL searchParams
      {
        onSuccess: (data) => {
          if (!isMounted) return;
          // Reset lại state khi session được khởi tạo thành công
          setIsFinished(false);
          isFinishedRef.current = false;
          setCurrentIndex(0);
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;
          setSessionCards(data.cards);
          startTimeRef.current = new Date();
        },
      },
    );

    return () => {
      isMounted = false;
      // Nếu user thoát trang giữa chừng (unmount), báo server cancel session
      if (sessionIdRef.current && !isFinishedRef.current) {
        cancelSession(sessionIdRef.current);
      }
    };
  }, [deckId, studyMode, startSession, cancelSession]);

  // --- 2. Kết thúc Session ---
  const onFinish = useCallback(
    (finalResults: ReviewResult[]) => {
      if (!sessionIdRef.current) return;
      isFinishedRef.current = true;

      const durationMs = Date.now() - startTimeRef.current.getTime();
      const minutesSpent = Math.max(1, Math.round(durationMs / 60000));

      syncSession(
        {
          sessionId: sessionIdRef.current,
          deckId,
          results: finalResults,
          minutesSpent,
        },
        {
          onSuccess: () => setIsFinished(true),
        },
      );
    },
    [deckId, syncSession],
  );

  // --- 3. Xử lý đánh giá thẻ ---
  const handleRate = useCallback(
    (rating: number) => {
      if (!currentCard || !sessionId) return;

      const sm2 = calculateSM2(
        {
          interval: currentCard.interval,
          easeFactor: currentCard.easeFactor,
          repetitions: currentCard.repetitions,
        },
        rating,
      );

      const newResult = {
        cardId: currentCard.id,
        rating,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        easeFactor: sm2.easeFactor,
        status: determineStatus(rating, sm2.interval, sm2.repetitions),
        nextReview: sm2.nextReview,
      };

      const updatedResults = [...results, newResult];
      setResults(updatedResults);

      if (currentIndex < totalCards - 1) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        onFinish(updatedResults);
      }
    },
    [currentCard, sessionId, results, currentIndex, totalCards, onFinish],
  );

  // --- View States ---

  if (isStarting) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Đang chuẩn bị lộ trình {studyMode ? "ôn tập thêm" : "học tập"}...
        </p>
      </div>
    );
  }

  if (isStarted && sessionCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 px-6 animate-in fade-in duration-500">
        <div className="bg-muted p-6 rounded-full">
          <Inbox className="w-12 h-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold">Không có thẻ nào!</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">
          {studyMode === "hard"
            ? "Tuyệt vời, bạn không có từ nào bị đánh giá là 'khó' trong bộ này."
            : "Bạn đã hoàn thành hết các thẻ cần học."}
        </p>
        <Button onClick={() => router.back()} variant="outline">
          Quay lại
        </Button>
      </div>
    );
  }

  if (isFinished) {
    return <SessionComplete results={results} deckId={deckId} />;
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-8">
      <ReviewProgress current={currentIndex + 1} total={totalCards} isSyncing={isSyncing} />

      <div className="relative min-h-96 flex items-center justify-center">
        {isSyncing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-semibold">Đang lưu kết quả vào bộ não của bạn...</p>
          </div>
        ) : currentCard && currentCard.word ? (
          <ReviewCard
            key={currentCard.id}
            card={currentCard as Card & { word: NonNullable<typeof currentCard.word> }}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(true)}
          />
        ) : null}
      </div>

      <div className="h-24">
        {!isSyncing && (
          <ReviewActions
            isFlipped={isFlipped}
            isSyncing={isSyncing}
            onRate={handleRate}
            onFlip={() => setIsFlipped(true)}
          />
        )}
      </div>
    </div>
  );
};
