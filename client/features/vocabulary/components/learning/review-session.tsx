"use client";

import { useState, useMemo } from "react";
import { Card, ReviewResult, CardStatus } from "../../types";
import { ReviewCard } from "./review-card";
import { ReviewActions } from "./review-actions";
import { SessionComplete } from "./session-complete";
import { calculateSM2 } from "../../utils/srs-logic";
import { Progress } from "@/components/ui/progress";
import { vocabApi } from "../../api/vocab-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ReviewSessionProps {
  initialCards: Card[];
  sessionId?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

export function ReviewSession({ initialCards, sessionId }: ReviewSessionProps) {
  const shuffledCards = useMemo(() => shuffleArray(initialCards), [initialCards]);

  const [queue, setQueue] = useState<Card[]>(shuffledCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCurrentCardWrong, setIsCurrentCardWrong] = useState(false); // Theo dõi lỗi gõ sai
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const currentCard = queue[currentIndex];

  // Xử lý khi ReviewCard báo gõ sai
  const handleWrongAnswer = () => {
    setIsCurrentCardWrong(true);
    setIsFlipped(true); // Lật thẻ để xem đáp án ngay lập tức
  };

  const handleAnswer = async (grade: 1 | 2 | 3 | 4, responseTime: number) => {
    if (!currentCard) return;

    // Nếu đã gõ sai, ép buộc Grade là 1 (Again) bất kể người dùng nhấn nút gì
    const finalGrade = isCurrentCardWrong ? 1 : grade;

    const { interval, repetition, easeFactor, nextReview } = calculateSM2(
      finalGrade,
      currentCard.interval,
      currentCard.repetition,
      currentCard.easeFactor,
    );

    let newStatus: CardStatus = currentCard.status;
    if (finalGrade === 1) newStatus = CardStatus.LAPSED;
    else if (currentCard.status === CardStatus.NEW) newStatus = CardStatus.LEARNING;
    else if (finalGrade >= 3) newStatus = CardStatus.REVIEW;

    const newResult: ReviewResult = {
      cardId: currentCard.id,
      status: newStatus,
      interval,
      repetition,
      easeFactor,
      nextReview: new Date(nextReview).toISOString(),
      lastGrade: finalGrade,
      responseTime,
    };

    const updatedResults = [...results, newResult];
    setResults(updatedResults);

    // Re-queue nếu sai hoặc chọn Again
    if (finalGrade === 1) {
      setQueue((prev) => [...prev, { ...currentCard }]);
      toast.info("Đã đưa từ này xuống cuối danh sách ôn tập", {
        position: "bottom-center",
        duration: 1500,
      });
    }

    // Chuyển thẻ hoặc Kết thúc
    if (currentIndex < queue.length - 1) {
      setIsFlipped(false);
      setIsCurrentCardWrong(false); // Reset trạng thái sai cho thẻ mới
      setCurrentIndex((prev) => prev + 1);
    } else {
      await syncDataWithServer(updatedResults);
    }
  };

  const syncDataWithServer = async (finalResults: ReviewResult[]) => {
    setIsSyncing(true);
    try {
      await vocabApi.syncReviews({
        sessionId,
        results: finalResults,
      });
      setIsFinished(true);
      toast.success("Đã hoàn thành và đồng bộ tiến độ!");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Không thể đồng bộ kết quả.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isFinished) return <SessionComplete total={initialCards.length} />;

  if (initialCards.length === 0) {
    return <div className="text-center py-20 italic text-muted-foreground">Hôm nay không có thẻ nào cần học!</div>;
  }

  const originalTotal = initialCards.length;
  const progressValue = Math.min((currentIndex / originalTotal) * 100, 100);

  return (
    <div className="space-y-8 py-10 max-w-4xl mx-auto w-full relative">
      {isSyncing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="font-bold text-lg">Đang đồng bộ kết quả...</p>
        </div>
      )}

      <div className="max-w-xl mx-auto space-y-3 px-4">
        <div className="flex justify-between items-end text-sm font-medium">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Progress</p>
            <p className="text-2xl font-black">
              {Math.min(currentIndex + 1, originalTotal)}
              <span className="text-muted-foreground text-sm font-normal"> / {originalTotal}</span>
            </p>
          </div>

          {queue.length > originalTotal && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-none animate-pulse">
              + {queue.length - originalTotal} thẻ học lại
            </Badge>
          )}
        </div>
        <Progress value={progressValue} className="h-2.5 transition-all duration-500" />
      </div>

      <ReviewCard
        key={`${currentCard?.id}-${currentIndex}`}
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(true)}
        onWrongAnswer={handleWrongAnswer} // Truyền callback xử lý lỗi
      />

      <div className="h-24 flex items-center justify-center">
        <ReviewActions
          isFlipped={isFlipped}
          onAnswer={handleAnswer}
          // Nếu muốn, bạn có thể truyền isCurrentCardWrong vào ReviewActions
          // để disable các nút Grade 2,3,4 khi người dùng gõ sai.
        />
      </div>
    </div>
  );
}
