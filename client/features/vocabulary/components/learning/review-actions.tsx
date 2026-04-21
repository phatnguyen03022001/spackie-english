"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ReviewActionsProps {
  isFlipped: boolean;
  isSyncing?: boolean;
  onRate: (rating: number) => void;
  onFlip: () => void;
  isAnswerCorrect?: boolean;
}

const RATINGS = [
  {
    value: 1,
    label: "Quên sạch",
    // Red/Rose: Chuyên nghiệp, không quá gắt
    color: "bg-rose-500 dark:bg-rose-600 hover:bg-rose-600 dark:hover:bg-rose-500 border-rose-700 dark:border-rose-800",
    ringColor: "ring-rose-500/30",
  },
  {
    value: 2,
    label: "Mơ hồ",
    // Amber/Orange: Cảnh báo nhẹ nhàng
    color:
      "bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-500 border-amber-700 dark:border-amber-800",
    ringColor: "ring-amber-500/30",
  },
  {
    value: 3,
    label: "Nhớ tốt",
    // Ocean Blue: Đồng bộ với Primary theme
    color: "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 border-blue-700 dark:border-blue-800",
    ringColor: "ring-blue-500/30",
  },
  {
    value: 4,
    label: "Quá dễ",
    // Emerald: Thành công, mượt mà
    color:
      "bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 border-emerald-700 dark:border-emerald-800",
    ringColor: "ring-emerald-500/30",
  },
];

export const ReviewActions = ({
  isFlipped,
  isSyncing = false,
  onRate,
  onFlip,
  isAnswerCorrect = false,
}: ReviewActionsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSyncing) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.repeat) return;

      if (!isFlipped) {
        if (e.code === "Space") {
          e.preventDefault();
          onFlip();
        }
        return;
      }

      if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
        const rating = Number(e.code.replace("Digit", ""));
        if (rating >= 3 && !isAnswerCorrect) return;
        e.preventDefault();
        onRate(rating);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isFlipped, isSyncing, onRate, onFlip, isAnswerCorrect]);

  if (!isFlipped) {
    return (
      <div className="flex justify-center w-full px-4 pb-6">
        <Button
          onClick={onFlip}
          disabled={isSyncing}
          size="lg"
          className={cn(
            "w-full h-12 font-bold rounded-xl shadow-sm",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "transition-all duration-200 ease-out",
            "hover:scale-[1.02] active:scale-[0.98]",
          )}>
          {isSyncing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <span>LẬT THẺ</span>
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-white/30 bg-white/10 px-2 text-[10px] font-medium text-white">
                SPACE
              </kbd>
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mx-auto px-4 pb-6",
        isSyncing && "opacity-50 pointer-events-none",
      )}>
      {RATINGS.map((rating) => {
        const isDisabled = rating.value >= 3 && !isAnswerCorrect;
        return (
          <button
            key={rating.value}
            disabled={isSyncing || isDisabled}
            onClick={() => onRate(rating.value)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-2",
              "rounded-2xl py-4 px-2 transition-all duration-75",
              "border-b-[5px] active:border-b-0 active:translate-y-[3px]",
              "text-white shadow-lg",
              rating.color,
              isDisabled && "opacity-30 grayscale cursor-not-allowed border-b-0 translate-y-[3px]",
              "focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-zinc-900",
              rating.ringColor,
            )}>
            {/* Phím tắt badge */}
            <span className="text-[10px] font-bold bg-black/20 dark:bg-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              {rating.value}
            </span>

            <span className="text-sm sm:text-base font-extrabold tracking-tight text-center leading-tight">
              {rating.label}
            </span>

            {/* Hiệu ứng sáng bề mặt khi hover */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          </button>
        );
      })}
    </div>
  );
};
