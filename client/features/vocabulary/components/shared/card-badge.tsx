import React from "react";
import { Badge } from "@/components/ui/badge";
import { CardStatus, DifficultyLevel } from "../../types";
import { cn } from "@/lib/utils";

interface CardBadgeProps {
  type: "status" | "level";
  value: CardStatus | DifficultyLevel;
  className?: string;
}

const statusConfig: Record<CardStatus, { label: string; className: string }> = {
  [CardStatus.NEW]: { label: "Mới", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  [CardStatus.LEARNING]: { label: "Đang học", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  [CardStatus.REVIEW]: { label: "Ôn tập", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  [CardStatus.MASTERED]: { label: "Đã thuộc", className: "bg-green-100 text-green-700 hover:bg-green-100" },
};

const levelConfig: Record<DifficultyLevel, { label: string; className: string }> = {
  [DifficultyLevel.BEGINNER]: { label: "Cơ bản", className: "border-green-500 text-green-600" },
  [DifficultyLevel.INTERMEDIATE]: { label: "Trung cấp", className: "border-yellow-500 text-yellow-600" },
  [DifficultyLevel.ADVANCED]: { label: "Nâng cao", className: "border-red-500 text-red-600" },
  [DifficultyLevel.EXAM_PREP]: { label: "Luyện thi", className: "border-purple-500 text-purple-600" },
  [DifficultyLevel.COMMUNICATION]: { label: "Giao tiếp", className: "border-blue-500 text-blue-600" },
};

export const CardBadge = ({ type, value, className }: CardBadgeProps) => {
  if (type === "status") {
    const config = statusConfig[value as CardStatus];
    return (
      <Badge variant="secondary" className={cn("font-medium", config.className, className)}>
        {config.label}
      </Badge>
    );
  }

  const config = levelConfig[value as DifficultyLevel];
  return (
    <Badge variant="outline" className={cn("font-semibold", config.className, className)}>
      {config.label}
    </Badge>
  );
};
