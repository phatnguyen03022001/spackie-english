"use client";

import React from "react";
import { Bell, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDueCount } from "../../api/use-decks";

interface DueCountBadgeProps {
  className?: string;
  showIcon?: boolean;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export const DueCountBadge = ({ className = "", showIcon = true, variant = "destructive" }: DueCountBadgeProps) => {
  const { data: dueCount, isLoading, error } = useDueCount();

  if (isLoading) {
    return (
      <Badge variant={variant} className={`gap-1 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Đang tải...</span>
      </Badge>
    );
  }

  if (error || !dueCount) {
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {showIcon && <Bell className="h-3 w-3" />}
        <span className="text-xs">--</span>
      </Badge>
    );
  }

  const count = dueCount.dueCount || 0;

  if (count === 0) {
    return (
      <Badge variant="secondary" className={`gap-1 ${className}`}>
        {showIcon && <Bell className="h-3 w-3" />}
        <span className="text-xs">Đã hoàn thành</span>
      </Badge>
    );
  }

  return (
    <Badge variant={variant} className={`gap-1 ${className}`}>
      {showIcon && <Bell className="h-3 w-3" />}
      <span className="text-xs font-bold">{count} thẻ cần ôn</span>
    </Badge>
  );
};
