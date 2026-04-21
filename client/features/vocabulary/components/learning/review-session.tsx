"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Inbox, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

// API & Types
import { useStartSession, useSyncSession, useCancelSession } from "../../api/use-learning";
import { calculateSM2 } from "../../utils/srs-logic";
import { ReviewResultSchema } from "../../schemas";
import { Card } from "../../schemas";
import { CardStatus, SessionMode } from "../../types";
import type { z } from "zod";

type ReviewResult = z.infer<typeof ReviewResultSchema>;

// Components
import { ReviewCard } from "./review-card";
import { ReviewProgress } from "./review-progress";
import { ReviewActions } from "./review-actions";
import { SessionComplete } from "./session-complete";
import { Button } from "@/components/ui/button";

interface ReviewSessionProps {
  deckId: string;
  studyMode?: SessionMode;
}

export const ReviewSession = ({ deckId, studyMode = SessionMode.DEFAULT }: ReviewSessionProps) => {
  const router = useRouter();

  // --- API Hooks ---
  const { mutate: startSession, isPending: isStarting, isSuccess: isStarted } = useStartSession();
  const { mutate: syncSession, isPending: isSyncing } = useSyncSession();
  const { mutate: cancelSession } = useCancelSession();

  // --- States ---
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [originalCards, setOriginalCards] = useState<Card[]>([]);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [cardsToRepeat, setCardsToRepeat] = useState<Card[]>([]);
  const [reviewedOriginalCards, setReviewedOriginalCards] = useState<Set<string>>(new Set());
  const [isCurrentAnswerCorrect, setIsCurrentAnswerCorrect] = useState(false);

  // Refs
  const startTimeRef = useRef<Date>(new Date());
  const isFinishedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const cardsToRepeatRef = useRef<Card[]>([]);

  const currentCard = sessionCards[currentIndex];
  const totalSessionCards = sessionCards.length;

  const shuffleCards = useCallback((cards: Card[]): Card[] => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const determineStatus = (rating: number, interval: number, repetitions: number): CardStatus => {
    if (rating < 3) return CardStatus.LEARNING;
    if (interval >= 21 || repetitions >= 8) return CardStatus.MASTERED;
    if (interval > 3) return CardStatus.REVIEW;
    return CardStatus.LEARNING;
  };

  useEffect(() => {
    let isMounted = true;
    startSession(
      { deckId, mode: studyMode, limit: 50, page: 1 },
      {
        onSuccess: (data) => {
          if (!isMounted) return;
          setIsFinished(false);
          isFinishedRef.current = false;
          setCurrentIndex(0);
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;
          const shuffledCards = shuffleCards(data.cards);
          setOriginalCards(shuffledCards);
          setSessionCards(shuffledCards);
          setCardsToRepeat([]);
          setReviewedOriginalCards(new Set());
          setResults([]);
          startTimeRef.current = new Date();
        },
      },
    );
    return () => {
      isMounted = false;
      if (sessionIdRef.current && !isFinishedRef.current) {
        cancelSession(sessionIdRef.current);
      }
    };
  }, [deckId, studyMode, startSession, cancelSession, shuffleCards]);

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
        { onSuccess: () => setIsFinished(true) },
      );
    },
    [deckId, syncSession],
  );

  const handleRate = useCallback(
    (rating: number) => {
      if (!currentCard || !sessionId || isFinished) return;
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
      setResults((prev) => [...prev, newResult]);
      if (originalCards.some((card) => card.id === currentCard.id)) {
        setReviewedOriginalCards((prev) => new Set([...prev, currentCard.id]));
      }
      if (rating < 3) {
        setCardsToRepeat((prev) => {
          const newRepeatCards = [...prev, currentCard];
          cardsToRepeatRef.current = newRepeatCards;
          return newRepeatCards;
        });
      }
      const isLastCardInSession = currentIndex >= totalSessionCards - 1;
      if (!isLastCardInSession) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setTimeout(() => {
          const currentRepeatCards = cardsToRepeatRef.current;
          if (currentRepeatCards.length > 0) {
            const shuffledRepeatCards = shuffleCards(currentRepeatCards);
            setSessionCards(shuffledRepeatCards);
            setCardsToRepeat([]);
            cardsToRepeatRef.current = [];
            setCurrentIndex(0);
            setIsFlipped(false);
          }
          const hasReviewedAllOriginal = reviewedOriginalCards.size >= originalCards.length;

          if (hasReviewedAllOriginal) {
            onFinish([...results, newResult]);
          } else {
            onFinish([...results, newResult]);
          }
        }, 100);
      }
    },
    [
      currentCard,
      sessionId,
      isFinished,
      currentIndex,
      totalSessionCards,
      originalCards,
      reviewedOriginalCards,
      results,
      shuffleCards,
      onFinish,
    ],
  );

  const progressCurrent =
    reviewedOriginalCards.size +
    (currentCard &&
    originalCards.some((card) => card.id === currentCard.id) &&
    !reviewedOriginalCards.has(currentCard.id)
      ? 1
      : 0);
  const progressTotal = originalCards.length;

  if (isStarting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="glass-panel w-full max-w-sm mx-auto flex flex-col items-center gap-4 p-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse text-center">
            Đang chuẩn bị lộ trình {studyMode !== SessionMode.DEFAULT ? "ôn tập thêm" : "học tập"}...
          </p>
        </div>
      </div>
    );
  }

  if (isStarted && originalCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="glass-panel max-w-md w-full text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">Không có thẻ nào!</h3>
          <p className="text-muted-foreground text-sm">
            {studyMode === SessionMode.HARD
              ? "Tuyệt vời, bạn không có từ nào bị đánh giá là 'khó' trong bộ này."
              : "Bạn đã hoàn thành hết các thẻ cần học."}
          </p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4 w-full">
            Quay lại Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return <SessionComplete results={results} deckId={deckId} />;
  }

  // ... (giữ nguyên các phần import và logic bên trên)

  return (
    <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Header: Đã được cấu trúc lại để Badge nằm dưới Progress */}
      <div className="flex flex-col gap-4">
        {/* Thanh Progress chiếm toàn bộ chiều ngang */}
        <ReviewProgress current={progressCurrent} total={progressTotal} isSyncing={isSyncing} />

        {/* Thẻ cần ôn lại: Bây giờ nằm ở hàng riêng bên dưới, căn giữa hoặc căn trái tùy bạn */}
        {cardsToRepeat.length > 0 && (
          <div className="flex justify-center sm:justify-start animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="glass dark:glass-dark flex items-center gap-2.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl text-foreground border-primary/20 shadow-sm">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </div>
              <span>
                Bạn có <span className="text-primary font-bold">{cardsToRepeat.length}</span> từ cần lặp lại trong lượt
                này
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Card Area */}
      <div className="relative min-h-112.5 sm:min-h-125 flex items-center justify-center">
        {isSyncing ? (
          <div className="glass-panel w-full max-w-sm mx-auto flex flex-col items-center gap-4 p-8 text-center animate-in fade-in zoom-in">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-semibold">Đang đồng bộ nơ-ron thần kinh...</p>
            <Zap size={16} className="text-muted-foreground animate-pulse" />
          </div>
        ) : currentCard && currentCard.word ? (
          <ReviewCard
            key={`${currentCard.id}-${currentIndex}`}
            card={currentCard as Card & { word: NonNullable<typeof currentCard.word> }}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(true)}
            onCorrectnessChange={(correct) => setIsCurrentAnswerCorrect(correct)}
          />
        ) : null}
      </div>

      {/* Actions */}
      <div className="mt-2 sm:mt-4">
        {!isSyncing && (
          <ReviewActions
            isFlipped={isFlipped}
            isSyncing={isSyncing}
            onRate={handleRate}
            onFlip={() => setIsFlipped(true)}
            isAnswerCorrect={isCurrentAnswerCorrect}
          />
        )}
      </div>
    </div>
  );
};
