"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { calculateSM2 } from "@/features/vocabulary/utils/srs-logic";
import { ReviewCard } from "@/features/vocabulary/components/learning/review-card";
import { ReviewActions } from "@/features/vocabulary/components/learning/review-actions";
import { SessionComplete } from "@/features/vocabulary/components/learning/session-complete";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, ReviewResult, ReviewSession } from "@/features/vocabulary/types";

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");

  // --- STATES ---
  const [queue, setQueue] = useState<Card[]>([]);
  const [prevSessionId, setPrevSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCurrentCardWrong, setIsCurrentCardWrong] = useState(false); // Thêm state quản lý lỗi gõ
  const [isFinished, setIsFinished] = useState(false);
  const [accumulatedResults, setAccumulatedResults] = useState<ReviewResult[]>([]);

  // --- FETCH DATA ---
  const {
    data: sessionData,
    isLoading,
    isError,
  } = useQuery<ReviewSession>({
    queryKey: ["review-session", deckId],
    queryFn: () => vocabApi.startSession(deckId as string),
    enabled: !!deckId,
    gcTime: 0,
    retry: false,
  });

  // --- SYNC STATE (Tránh re-render loop) ---
  if (sessionData && sessionData.id !== prevSessionId) {
    setPrevSessionId(sessionData.id);
    setQueue(shuffleArray(sessionData.cards));
  }

  const syncMutation = useMutation({
    mutationFn: vocabApi.syncReviews,
    onSuccess: (data) => {
      setIsFinished(true);
      toast.success(`Đã đồng bộ! +${data.xpEarned} XP`);
    },
    onError: () => toast.error("Lỗi đồng bộ kết quả."),
  });

  const currentCard = queue[currentIndex];

  // Callback khi gõ sai từ ReviewCard
  const handleWrongAnswer = () => {
    setIsCurrentCardWrong(true);
    setIsFlipped(true); // Lật để xem đáp án
  };

  const handleAnswer = async (grade: 1 | 2 | 3 | 4, responseTime: number) => {
    if (!currentCard) return;

    // Ép về Grade 1 nếu đã từng gõ sai thẻ này
    const finalGrade = isCurrentCardWrong ? 1 : grade;

    const srs = calculateSM2(finalGrade, currentCard.interval, currentCard.repetition, currentCard.easeFactor);

    const newResult: ReviewResult = {
      cardId: currentCard.id,
      status: srs.status,
      interval: srs.interval,
      repetition: srs.repetition,
      easeFactor: srs.easeFactor,
      nextReview: srs.nextReview,
      lastGrade: finalGrade,
      responseTime,
    };

    const updatedResults = [...accumulatedResults, newResult];
    setAccumulatedResults(updatedResults);

    // Logic Re-queue: Nếu sai hoặc chọn Again
    if (finalGrade === 1) {
      setQueue((prev) => [...prev, { ...currentCard }]);
    }

    // Chuyển card hoặc Sync
    if (currentIndex < queue.length - 1) {
      setIsFlipped(false);
      setIsCurrentCardWrong(false); // Quan trọng: Reset trạng thái sai cho từ mới
      setCurrentIndex((prev) => prev + 1);
    } else {
      syncMutation.mutate({ sessionId: sessionData?.id, results: updatedResults });
    }
  };

  // --- RENDER LOGIC ---
  if (isLoading) return <ReviewPageSkeleton />;
  if (isError) return <div className="p-10 text-center">Lỗi tải dữ liệu.</div>;

  // Chỉ báo No cards khi thực sự server trả về mảng rỗng
  if (sessionData && sessionData.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No cards to review!</h2>
        <Button onClick={() => router.back()}>Quay lại</Button>
      </div>
    );
  }

  if (!currentCard && !isFinished) return <ReviewPageSkeleton />;
  if (isFinished) return <SessionComplete total={sessionData?.cards?.length || 0} />;

  const originalTotal = sessionData?.cards?.length || 1;
  const progressValue = Math.min((currentIndex / originalTotal) * 100, 100);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {syncMutation.isPending && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="font-bold">Đang lưu kết quả...</p>
        </div>
      )}

      <header className="p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <X />
          </Button>
          <div className="flex-1 px-8">
            <Progress value={progressValue} className="h-2" />
            {queue.length > originalTotal && (
              <p className="text-[10px] text-center text-orange-500 font-bold mt-1 animate-pulse">
                + {queue.length - originalTotal} từ cần ôn lại
              </p>
            )}
          </div>
          <span className="text-sm font-mono font-bold">
            {Math.min(currentIndex + 1, originalTotal)}/{originalTotal}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <ReviewCard
            key={`${currentCard.id}-${currentIndex}`}
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(true)}
            onWrongAnswer={handleWrongAnswer} // Truyền callback xử lý gõ sai
          />
        </div>
        <div className="h-28 mt-8 flex items-center justify-center w-full">
          <ReviewActions
            isFlipped={isFlipped}
            onAnswer={handleAnswer}
            isWrong={isCurrentCardWrong} // Để Actions biết và hiện nút "Tiếp tục"
          />
        </div>
      </main>
    </div>
  );
}

function ReviewPageSkeleton() {
  return (
    <div className="p-10 space-y-8 max-w-2xl mx-auto w-full">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-[400px] w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
