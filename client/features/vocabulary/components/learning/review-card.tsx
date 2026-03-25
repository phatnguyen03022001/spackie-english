"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card as CardType } from "../../types";
import { Card, CardContent } from "@/components/ui/card";
import { AudioPlayer } from "../shared/audio-player";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ReviewCardProps {
  card: CardType;
  isFlipped: boolean;
  onFlip: () => void;
  onWrongAnswer?: () => void; // Callback để báo cho Session xử lý logic Grade 1
}

export function ReviewCard({ card, isFlipped, onFlip, onWrongAnswer }: ReviewCardProps) {
  const [userInput, setUserInput] = useState("");
  const [isWrong, setIsWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ hóa state khi đổi thẻ (Reset state cho thẻ mới)
  const [prevCardId, setPrevCardId] = useState(card.id);
  if (card.id !== prevCardId) {
    setPrevCardId(card.id);
    setUserInput("");
    setIsWrong(false);
  }

  // Tự động focus vào ô nhập liệu
  useEffect(() => {
    if (!isFlipped) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, card.id]);

  const checkAnswer = () => {
    const isCorrect = userInput.trim().toLowerCase() === card.word.toLowerCase();

    if (isCorrect) {
      setIsWrong(false);
      onFlip();
    } else {
      setIsWrong(true);
      // Đợi hiệu ứng rung một chút rồi mới lật thẻ để xem đáp án
      setTimeout(() => {
        onWrongAnswer?.();
      }, 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isFlipped) checkAnswer();
    }
  };

  return (
    <Card
      className={cn(
        "w-full max-w-2xl mx-auto min-h-[500px] shadow-2xl border-2 transition-all duration-500 overflow-hidden",
        isFlipped ? "border-primary/20 bg-card" : "border-muted",
        isWrong && !isFlipped && "border-destructive animate-shake", // Hiệu ứng rung khi sai
      )}>
      <CardContent className="p-6 md:p-10 flex flex-col min-h-[500px]">
        {!isFlipped ? (
          /* --- MẶT TRƯỚC --- */
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="mb-2 uppercase tracking-widest text-[10px]">
                {card.status || "Reviewing"}
              </Badge>
              <p className="text-sm text-muted-foreground font-medium italic">
                {card.meanings[0]?.partOfSpeech || "Vocabulary"}
              </p>
              <h2 className="text-3xl font-bold leading-tight px-4">
                {card.meanings[0]?.definitions[0]?.definition || "Chưa có định nghĩa"}
              </h2>
            </div>

            <div className="w-full max-w-sm space-y-4">
              <Input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type the English word..."
                className={cn(
                  "text-center text-3xl h-20 border-2 transition-all font-bold tracking-tight",
                  isWrong ? "border-destructive ring-2 ring-destructive/20" : "focus-visible:ring-primary",
                )}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-center text-muted-foreground opacity-70">
                Nhấn <kbd className="bg-muted px-1.5 py-0.5 rounded border font-sans">Enter</kbd> để kiểm tra
              </p>
            </div>
          </div>
        ) : (
          /* --- MẶT SAU --- */
          <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2
                    className={cn(
                      "text-5xl font-black tracking-tighter",
                      isWrong ? "text-destructive" : "text-primary",
                    )}>
                    {card.word}
                  </h2>
                  {card.audioUrl && <AudioPlayer url={card.audioUrl} autoPlay />}
                </div>
                {card.phonetic && (
                  <p className="text-xl font-mono text-muted-foreground tracking-wide">{card.phonetic}</p>
                )}
              </div>

              {/* So sánh trực quan lỗi sai */}
              <div
                className={cn(
                  "text-right p-3 rounded-xl border min-w-[140px]",
                  isWrong ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20",
                )}>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  {isWrong ? "Bạn đã gõ sai:" : "Bạn đã gõ đúng:"}
                </p>
                <p
                  className={cn(
                    "font-mono font-bold text-lg break-all",
                    isWrong ? "text-destructive line-through" : "text-green-600",
                  )}>
                  {userInput || "..."}
                </p>
              </div>
            </div>

            <Separator />

            {/* Nội dung chi tiết */}
            <div className="space-y-6 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
              {card.meanings.map((meaning, mIdx) => (
                <div
                  key={mIdx}
                  className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-muted/50 transition-colors">
                  <Badge
                    variant="outline"
                    className="bg-background text-primary border-primary/30 font-bold uppercase text-[10px]">
                    {meaning.partOfSpeech}
                  </Badge>

                  {meaning.definitions.map((def, dIdx) => (
                    <div key={dIdx} className="space-y-3 border-b border-muted last:border-0 pb-4 last:pb-0">
                      <div className="flex gap-3">
                        <span className="text-primary/40 font-bold text-sm mt-1">{dIdx + 1}.</span>
                        <div className="space-y-3 w-full">
                          <p className="text-lg font-medium leading-snug">{def.definition}</p>
                          {def.example && (
                            <p className="text-muted-foreground border-l-4 border-primary/20 pl-4 py-2 italic bg-primary/5 rounded-r-xl text-sm">
                              &quot;{def.example}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
