"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, CheckCircle2, XCircle, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

/* =========================
   Types (Sửa lỗi TS)
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
  word: Word; // word là object, không phải string
}

interface ReviewCardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
}

/* =========================
   Component
========================= */
export const ReviewCard = ({ card, isFlipped, onFlip }: ReviewCardProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Focus vào ô input khi thẻ mới hiện ra (Mặt trước)
  useEffect(() => {
    if (!isFlipped) {
      inputRef.current?.focus();
    }
  }, [card.id, isFlipped]);

  // Tự động phát âm thanh khi lật sang mặt sau
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
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioRef.current?.play();
  };

  // So sánh kết quả: không phân biệt hoa thường, bỏ khoảng trắng đầu cuối
  const isCorrect = userInput.trim().toLowerCase() === card.word.word.trim().toLowerCase();

  return (
    <div className="group w-full max-w-md h-125 select-none perspective-[1000px]">
      <div
        className={cn(
          "relative w-full h-full transition-all duration-500 transform-3d shadow-2xl rounded-3xl border bg-card",
          isFlipped ? "transform-[rotateY(180deg)]" : "",
        )}>
        {/* MẶT TRƯỚC (FRONT): Hiển thị nghĩa tiếng Việt/Định nghĩa */}
        <div className="absolute inset-0 backface-hidden flex flex-col p-8 text-center" aria-hidden={isFlipped}>
          <div className="flex flex-col items-center justify-center flex-1 space-y-6">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Languages size={24} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Dịch sang tiếng Anh
              </span>
              <h2 className="text-2xl font-bold leading-tight text-foreground line-clamp-4">
                {card.word.meanings[0]?.definitions[0]?.definition || "Không có định nghĩa"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="w-full pt-8 space-y-4">
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    // CHẶN PHÍM TẮT: Không cho phím Space/Enter lật thẻ sớm khi đang gõ
                    if (e.code === "Space") e.stopPropagation();
                  }}
                  placeholder="Nhập từ tiếng Anh..."
                  className="h-16 text-center text-2xl font-black bg-muted/50 border-2 border-primary/10 focus-visible:border-primary focus-visible:ring-0 rounded-2xl transition-all"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20 uppercase tracking-widest">
                Kiểm tra (Enter)
              </Button>
            </form>
          </div>

          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-30">
            Mẹo: Nhập rồi nhấn Enter
          </p>
        </div>

        {/* MẶT SAU (BACK): Kết quả và Chi tiết từ vựng */}
        <div
          className="absolute inset-0 backface-hidden transform-[rotateY(180deg)] flex flex-col p-6 overflow-hidden bg-card rounded-3xl"
          aria-hidden={!isFlipped}>
          {/* Banner kết quả */}
          <div
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-4 rounded-2xl mb-4 border animate-in zoom-in duration-300",
              isCorrect
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                : "bg-red-500/10 border-red-500/20 text-red-600",
            )}>
            <div className="flex items-center gap-2">
              {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <span className="text-sm font-black uppercase tracking-tighter">
                {isCorrect ? "Chính xác!" : "Chưa đúng rồi"}
              </span>
            </div>
            {!isCorrect && (
              <p className="text-xs opacity-80 font-medium italic">Bạn đã nhập: {userInput || "để trống"}</p>
            )}
          </div>

          {/* Thông tin từ vựng chính */}
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div className="text-left">
              <h2 className="text-3xl font-black text-foreground tracking-tighter">{card.word.word}</h2>
              <p className="text-sm font-mono text-primary font-bold">{card.word.phonetic}</p>
            </div>
            {card.word.audioUrl && (
              <div className="flex items-center">
                <audio ref={audioRef} src={card.word.audioUrl} />
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full h-12 w-12 shadow-sm hover:bg-primary hover:text-white transition-colors"
                  onClick={playAudio}>
                  <Volume2 size={20} />
                </Button>
              </div>
            )}
          </div>

          {/* Danh sách nghĩa chi tiết */}
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-6 pb-4">
              {card.word.meanings.map((meaning, mIdx) => (
                <div key={mIdx} className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                      {meaning.partOfSpeech}
                    </span>
                  </div>
                  <div className="space-y-4 pl-1">
                    {meaning.definitions.map((def, dIdx) => (
                      <div key={dIdx} className="pl-4 border-l-2 border-border group">
                        <p className="text-sm font-medium leading-relaxed text-foreground/90">{def.definition}</p>
                        {def.example && (
                          <p className="text-xs text-muted-foreground mt-2 italic bg-muted/50 p-2 rounded-lg border border-border/50">
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
