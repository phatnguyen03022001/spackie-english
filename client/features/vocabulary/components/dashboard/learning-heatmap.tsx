"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string;
  count: number;
}

interface HeatmapProps {
  // Cho phép data có thể không tồn tại hoặc không phải mảng để tránh crash
  data?: HeatmapDay[];
}

export function LearningHeatmap({ data }: HeatmapProps) {
  // QUAN TRỌNG: Nếu data không phải mảng (ví dụ là {}), ép về mảng rỗng để .map không bị lỗi
  const safeData = Array.isArray(data) ? data : [];

  // Hàm xác định màu dựa trên số lượng review (Dùng màu Primary của theme để đồng bộ UI)
  const getColor = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count < 10) return "bg-primary/30";
    if (count < 30) return "bg-primary/60";
    return "bg-primary";
  };

  // Nếu không có dữ liệu, hiển thị thông báo nhẹ nhàng thay vì để trống hoặc lỗi
  if (safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border border-dashed rounded-md">
        Chưa có hoạt động ghi nhận trong 30 ngày qua.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <TooltipProvider>
          {safeData.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div className={cn("h-4 w-4 rounded-sm transition-colors cursor-help", getColor(day.count))} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">
                  {day.date}: <span className="text-primary">{day.count} lượt ôn tập</span>
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Chú thích (Legend) */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <span>Ít</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-primary/30" />
          <div className="h-3 w-3 rounded-sm bg-primary/60" />
          <div className="h-3 w-3 rounded-sm bg-primary" />
        </div>
        <span>Nhiều</span>
      </div>
    </div>
  );
}
