"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Timer, Zap, Loader2, Target, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ReviewProgressProps {
  current: number;
  total: number;
  isSyncing?: boolean;
}

export const ReviewProgress = ({ current, total, isSyncing = false }: ReviewProgressProps) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isSyncing || current > total) return;
    const interval = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isSyncing, current, total]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  const progressPercentage = Math.min((current / total) * 100, 100);
  const remainingCards = total - current;

  return (
    <div className="w-full glass-panel p-4 rounded-xl transition-all duration-300">
      {/* Header - responsive flex */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shadow-sm">
            <Target size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiến độ học tập</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{current}</span>
              <span className="text-sm font-medium text-muted-foreground">/ {total} thẻ</span>
              {remainingCards > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Còn {remainingCards}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/50",
              isSyncing ? "border-primary/30" : "border-border",
            )}>
            <Timer size={14} className={cn(isSyncing ? "text-primary" : "text-muted-foreground")} />
            <span className="font-mono text-sm font-bold tabular-nums">{formattedTime}</span>
          </div>
          {isSyncing && (
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
              <Loader2 size={12} className="animate-spin text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Đang lưu...</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar with glow */}
      <div className="relative my-2">
        <Progress value={progressPercentage} className="h-2 bg-muted rounded-full overflow-hidden" />
        {progressPercentage > 0 && (
          <div
            className="absolute top-0 h-2 w-8 bg-gradient-to-r from-transparent via-primary/40 to-transparent transition-all duration-300 rounded-full"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          />
        )}
      </div>

      {/* Footer status */}
      <div className="flex justify-between items-center mt-2 px-0.5">
        <div className="flex items-center gap-1.5 text-muted-foreground/70">
          <Zap size={12} className="fill-current" />
          <span className="text-xs font-semibold uppercase tracking-wide">Chế độ tập trung</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp size={12} className="text-primary/60" />
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wide",
              progressPercentage === 100 ? "text-primary" : "text-muted-foreground/60",
            )}>
            {progressPercentage === 100 ? "Hoàn thành!" : "Cố gắng lên!"}
          </span>
        </div>
      </div>
    </div>
  );
};
