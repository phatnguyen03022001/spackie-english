"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, CheckCircle2, XCircle, Languages, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

/* =========================
   Types
========================= */
interface Definition {
  definition: string;
  example?: string | null;
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

interface Word {
  word: string;
  phonetic?: string | null;
  audioUrl?: string | null;
  meanings: Meaning[];
}

interface Card {
  id: string;
  word: Word;
}

interface ReviewCardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  onCorrectnessChange?: (isCorrect: boolean) => void;
}

/* =========================
   Component
========================= */
export const ReviewCard = ({ card, isFlipped, onFlip, onCorrectnessChange }: ReviewCardProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // So sánh kết quả: không phân biệt hoa thường, bỏ khoảng trắng đầu cuối
  const isCorrect = userInput.trim().toLowerCase() === card.word.word.trim().toLowerCase();

  useEffect(() => {
    if (!isFlipped) {
      inputRef.current?.focus();
    }
  }, [card.id, isFlipped]);

  useEffect(() => {
    if (isFlipped && inputRef.current) {
      inputRef.current.blur();
    }
  }, [isFlipped]);

  useEffect(() => {
    if (isFlipped && card.word.audioUrl && audioRef.current) {
      audioRef.current.play().catch((err) => console.log("Audio play blocked:", err));
    }
  }, [isFlipped, card.word.audioUrl]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitted || isFlipped) return;
    setIsSubmitted(true);
    onFlip();
    onCorrectnessChange?.(isCorrect);
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioRef.current?.play();
  };

  return (
    <div className="group w-full h-112.5 sm:h-125 select-none perspective-[1000px]">
      <div
        className={cn(
          "relative w-full h-full transition-all duration-500 transform-3d",
          isFlipped ? "transform-[rotateY(180deg)]" : "",
        )}>
        {/* MẶT TRƯỚC (FRONT): Hiển thị nghĩa tiếng Việt/Định nghĩa */}
        <div
          className="absolute inset-0 backface-hidden flex flex-col p-5 sm:p-6 text-center glass dark:glass-dark rounded-(--radius-2xl)"
          aria-hidden={isFlipped}>
          <div className="flex flex-col items-center justify-center flex-1 space-y-4 sm:space-y-6">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Languages size={24} className="sm:w-7 sm:h-7" />
            </div>

            <div className="space-y-2 flex-1 flex flex-col justify-center">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Dịch sang tiếng Anh
              </span>
              <h2 className="text-lg sm:text-xl font-bold leading-tight text-foreground line-clamp-4">
                {card.word.meanings[0]?.definitions[0]?.definition || "Không có định nghĩa"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="w-full pt-4 sm:pt-6 space-y-3 sm:space-y-4 shrink-0">
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={isFlipped}
                  onKeyDown={(e) => {
                    if (e.code === "Space") e.stopPropagation();
                  }}
                  placeholder="Nhập từ tiếng Anh..."
                  className="h-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-background/50 backdrop-blur-sm rounded-xl transition-all focus:ring-2 focus:ring-primary/50 border-primary/20"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-12 font-bold rounded-xl shadow-sm",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "transition-all duration-200 ease-out",
                  "hover:scale-[1.02] active:scale-[0.98]",
                )}>
                <ArrowRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                Kiểm tra (Enter)
              </Button>
            </form>
          </div>
        </div>

        {/* MẶT SAU (BACK): Kết quả và Chi tiết từ vựng */}
        <div
          className="absolute inset-0 backface-hidden transform-[rotateY(180deg)] flex flex-col p-5 sm:p-6 overflow-hidden glass dark:glass-dark rounded-[var(--radius-2xl)]"
          aria-hidden={!isFlipped}>
          {/* Banner kết quả */}
          <div
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2.5 sm:py-3 rounded-xl mb-3 sm:mb-4 border backdrop-blur-md shrink-0",
              isCorrect
                ? "bg-success/15 border-success/30 text-success dark:text-success-foreground"
                : "bg-destructive/10 border-destructive/20 text-destructive",
            )}>
            <div className="flex items-center gap-2">
              {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <span className="text-sm font-bold uppercase tracking-tight">
                {isCorrect ? "Chính xác!" : "Chưa đúng rồi"}
              </span>
            </div>
            {!isCorrect && (
              <p className="text-xs opacity-80 font-medium italic">Bạn đã nhập: {userInput || "để trống"}</p>
            )}
          </div>

          {/* Thông tin từ vựng chính */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3 sm:pb-4 mb-3 sm:mb-4 shrink-0">
            <div className="text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{card.word.word}</h2>
              <p className="text-sm font-mono text-primary font-semibold">{card.word.phonetic}</p>
            </div>
            {card.word.audioUrl && (
              <div className="flex items-center">
                <audio ref={audioRef} src={card.word.audioUrl} />
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full h-10 w-10 hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95 bg-background/50 border border-border/50"
                  onClick={playAudio}>
                  <Volume2 size={18} />
                </Button>
              </div>
            )}
          </div>

          {/* Danh sách nghĩa chi tiết */}
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-5 pb-4">
              {card.word.meanings.map((meaning, mIdx) => (
                <div key={mIdx} className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-[10px] sm:text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/20">
                      {meaning.partOfSpeech}
                    </span>
                  </div>
                  <div className="space-y-3 sm:space-y-4 pl-1">
                    {meaning.definitions.map((def, dIdx) => (
                      <div key={dIdx} className="pl-3 sm:pl-4 border-l-2 border-primary/30 group">
                        <p className="text-sm font-medium leading-relaxed text-foreground/90">{def.definition}</p>
                        {def.example && (
                          <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2 italic bg-background/40 backdrop-blur-sm p-2 rounded-lg border border-border/30">
                            &quot;{def.example}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
