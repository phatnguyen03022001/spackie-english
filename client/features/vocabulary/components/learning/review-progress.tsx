"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Timer, Zap, Loader2, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ReviewProgressProps {
  current: number;
  total: number;
  isSyncing?: boolean;
}

export const ReviewProgress = ({ current, total, isSyncing = false }: ReviewProgressProps) => {
  const [seconds, setSeconds] = useState(0);

  // 1. Logic Timer: Pause khi isSyncing hoặc khi đã xong (current > total)
  useEffect(() => {
    // Nếu đang sync hoặc đã làm xong card cuối cùng thì không chạy timer
    if (isSyncing || current > total) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSyncing, current, total]);

  // 2. Format thời gian 00:00 (Sử dụng useMemo để tránh tính toán lại thừa)
  const formattedTime = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [seconds]);

  // 3. Tính toán % tiến độ
  // Đảm bảo không vượt quá 100% nếu có logic re-review
  const progressPercentage = Math.min((current / total) * 100, 100);
  const remainingCards = total - current;

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-end justify-between">
        {/* Chỉ số thẻ & Mục tiêu */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <Target size={20} className="animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
              Tiến độ phiên học
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums tracking-tighter">{current}</span>
              <span className="text-sm font-bold text-muted-foreground/50">/ {total} thẻ</span>
              {remainingCards > 0 && (
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground animate-in fade-in duration-1000">
                  Còn {remainingCards}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timer & Sync Status */}
        <div className="flex flex-col items-end gap-1">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors bg-card shadow-sm",
              isSyncing ? "border-primary/30" : "border-border",
            )}>
            <Timer size={14} className={cn(isSyncing ? "text-primary" : "text-muted-foreground")} />
            <span className="font-mono text-sm font-black tabular-nums">{formattedTime}</span>
          </div>

          {isSyncing && (
            <div className="flex items-center gap-1.5 px-2">
              <Loader2 size={10} className="animate-spin text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">Đang lưu kết quả...</span>
            </div>
          )}
        </div>
      </div>

      {/* Thanh Progress Bar */}
      <div className="relative group">
        <Progress
          value={progressPercentage}
          className="h-3 bg-secondary/50 overflow-hidden rounded-full border border-border/50"
        />

        {/* Glow effect tại đầu thanh progress */}
        <div
          className="absolute top-0 h-3 w-8 bg-linear-to-r from-transparent via-white/40 to-transparent transition-all duration-500 ease-out"
          style={{
            left: `${progressPercentage - 5}%`,
            opacity: progressPercentage > 5 ? 1 : 0,
          }}
        />

        {/* Milestone indicator (Tùy chọn: Đánh dấu mốc 50%, 100%) */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
          <div className="h-full w-px bg-background/20 ml-[50%]" />
        </div>
      </div>

      {/* Quick Fact nhỏ bên dưới (Optional) */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1 text-muted-foreground/60">
          <Zap size={10} className="fill-current" />
          <span className="text-[9px] font-bold uppercase">Focus Mode Active</span>
        </div>
        <span className="text-[9px] font-bold uppercase text-muted-foreground/60 italic">
          {progressPercentage === 100 ? "Hoàn thành!" : "Cố gắng lên!"}
        </span>
      </div>
    </div>
  );
};
