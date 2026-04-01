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
}

// Sử dụng các biến màu từ globals.css (shadcn default)
const RATINGS = [
  {
    value: 1,
    label: "Quên sạch",
    color: "bg-destructive text-destructive-foreground hover:opacity-90 border-destructive/50",
  },
  {
    value: 2,
    label: "Mơ hồ",
    color: "bg-orange-500 text-white hover:bg-orange-600 border-orange-700/30", // Màu cam thường không có trong shadcn default, giữ nguyên hoặc dùng accent
  },
  {
    value: 3,
    label: "Nhớ tốt",
    color: "bg-primary text-primary-foreground hover:opacity-90 border-primary/50",
  },
  {
    value: 4,
    label: "Quá dễ",
    color: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary-foreground/10",
  },
];

export const ReviewActions = ({ isFlipped, isSyncing = false, onRate, onFlip }: ReviewActionsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSyncing) return;

      // ❗ ignore nếu đang gõ ở input/editable
      const el = document.activeElement as HTMLElement | null;

      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }

      // ❗ tránh giữ phím
      if (e.repeat) return;

      if (!isFlipped) {
        if (e.code === "Space") {
          e.preventDefault();
          e.stopPropagation();
          onFlip();
        }
        return;
      }

      // ❗ chỉ nhận phím số hàng trên (không numpad)
      if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();

        const rating = Number(e.code.replace("Digit", ""));
        onRate(rating);
      }
    };

    // capture phase → chạy TRƯỚC React & input
    window.addEventListener("keydown", handleKeyDown, true);

    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isFlipped, isSyncing, onRate, onFlip]);

  if (!isFlipped) {
    return (
      <div className="flex justify-center w-full animate-in fade-in zoom-in duration-300 px-4">
        <Button
          onClick={onFlip}
          disabled={isSyncing}
          size="lg"
          className="w-full max-w-md h-16 text-xl font-black rounded-[2rem] shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 border-b-4 border-black/20">
          {isSyncing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "LẬT THẺ (Space)"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-3 md:gap-6 w-full max-w-4xl mx-auto px-4 animate-in slide-in-from-bottom-6 duration-500",
        isSyncing && "opacity-50 pointer-events-none",
      )}>
      {RATINGS.map((rating) => (
        <button
          key={rating.value}
          disabled={isSyncing}
          onClick={() => onRate(rating.value)}
          className={cn(
            "group relative flex flex-col items-center justify-center gap-2 rounded-[2rem] py-6 px-2 transition-all shadow-xl border-b-4",
            rating.color,
            "hover:-translate-y-2 active:translate-y-0 active:border-b-0",
          )}>
          {/* Số điểm nổi bật */}
          <span className="text-3xl md:text-4xl font-black tracking-tighter drop-shadow-md">{rating.value}</span>

          {/* Nhãn mô tả */}
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-90 text-center leading-none">
            {rating.label}
          </span>

          {/* KND: Keyboard Hint */}
          <div className="hidden md:flex absolute -top-2 -right-1 h-7 w-7 items-center justify-center bg-background text-foreground text-xs rounded-full border-2 border-current font-black shadow-lg group-hover:scale-120 transition-transform">
            {rating.value}
          </div>
        </button>
      ))}
    </div>
  );
};
