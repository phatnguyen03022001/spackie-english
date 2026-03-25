"use client";

import { Badge } from "@/components/ui/badge";
import { CardStatus } from "../../types";
import { cn } from "@/lib/utils";

interface CardBadgeProps {
  status: CardStatus;
  className?: string;
}

const statusConfig: Record<CardStatus, { label: string; class: string }> = {
  [CardStatus.NEW]: {
    label: "Mới",
    class: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  },
  [CardStatus.LEARNING]: {
    label: "Đang học",
    class: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100",
  },
  [CardStatus.REVIEW]: {
    label: "Đã thuộc",
    class: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  [CardStatus.LAPSED]: {
    label: "Quên",
    class: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
};

export function CardBadge({ status, className }: CardBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn("font-medium", config.class, className)}>
      {config.label}
    </Badge>
  );
}
