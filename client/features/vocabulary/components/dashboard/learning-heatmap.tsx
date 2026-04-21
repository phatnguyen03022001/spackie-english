"use client";

import React, { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

export function LearningHeatmap({ data }: { data: Record<string, number> }) {
  // 1. Tạo mảng 365 ngày liên tục tính từ hôm nay
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        count: data[dateStr] || 0,
      });
    }
    return days;
  }, [data]);

  // 2. Tính chuỗi hiện tại (streak)
  const currentStreak = useMemo(() => {
    let streak = 0;
    // Duyệt từ ngày gần nhất (cuối mảng)
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) streak++;
      else break;
    }
    return streak;
  }, [heatmapData]);

  // 3. Tìm ngày có count cao nhất
  const mostProductive = useMemo(() => {
    let max = 0;
    let maxDate = "";
    for (const day of heatmapData) {
      if (day.count > max) {
        max = day.count;
        maxDate = day.date;
      }
    }
    return { count: max, date: maxDate };
  }, [heatmapData]);

  // 4. Định nghĩa thang màu (giữ nguyên)
  const getColorClass = (count: number) => {
    if (count === 0) return "bg-secondary/40 opacity-20";
    if (count < 5) return "bg-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.05)]";
    if (count < 15) return "bg-primary/40 shadow-[0_0_12px_rgba(var(--primary),0.1)]";
    if (count < 30) return "bg-primary/70 shadow-[0_0_15px_rgba(var(--primary),0.2)]";
    return "bg-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Legend & Header mini */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black tracking-tight uppercase">
            Tần suất <span className="text-orange-500">Rèn luyện</span>
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground/40 leading-none">365 ngày gần nhất</p>
        </div>

        {/* Modern Legend */}
        <div className="flex items-center gap-2 px-3 py-1.5 glass border-primary/5 rounded-full shadow-inner">
          <span className="text-[9px] font-black uppercase text-muted-foreground/30">Less</span>
          <div className="flex gap-1">
            {[0, 4, 14, 29, 50].map((val) => (
              <div key={val} className={`h-2 w-2 rounded-full ${getColorClass(val)}`} />
            ))}
          </div>
          <span className="text-[9px] font-black uppercase text-muted-foreground/30">More</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="relative group/heatmap">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          <TooltipProvider delayDuration={0}>
            {heatmapData.map((day) => (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      h-3.5 w-3.5 rounded-[4px] transition-all duration-300 
                      cursor-pointer hover:scale-125 hover:z-10 
                      ${getColorClass(day.count)}
                    `}
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent
                    side="top"
                    className="glass border-primary/10 px-4 py-2.5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">
                        {day.count} bài ôn tập
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground/80">{formatDate(day.date)}</span>
                    </div>
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        <div className="absolute right-0 top-0 bottom-4 w-12 bg-linear-to-l from-background/50 to-transparent pointer-events-none" />
      </div>

      {/* Quick Insights – lấy từ dữ liệu thực */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-secondary/10 border border-border/5">
          <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-wider">
            Chuỗi hiện tại
          </span>
          <span className="text-sm font-black text-orange-500">🔥 {currentStreak} ngày</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-secondary/10 border border-border/5">
          <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-wider">
            Ngày năng suất nhất
          </span>
          <span className="text-sm font-black text-blue-500">
            🚀 {mostProductive.count} từ
            {mostProductive.date && ` (${formatDate(mostProductive.date)})`}
          </span>
        </div>
      </div>
    </div>
  );
}
