"use client";

import React from "react";
import { Globe, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTogglePublicStatus } from "../../api/use-management";

interface TogglePublicButtonProps {
  deckId: string;
  isPublic: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export const TogglePublicButton = ({ deckId, isPublic, className = "", size = "default" }: TogglePublicButtonProps) => {
  const { mutate: togglePublic, isPending } = useTogglePublicStatus();

  const handleToggle = () => {
    togglePublic({ id: deckId, isPublic: !isPublic });
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 px-3 text-xs";
      case "lg":
        return "h-12 px-6 text-base";
      default:
        return "h-10 px-4 text-sm";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return 12;
      case "lg":
        return 20;
      default:
        return 16;
    }
  };

  const iconSize = getIconSize();

  return (
    <Button
      variant={isPublic ? "default" : "outline"}
      size={size}
      onClick={handleToggle}
      disabled={isPending}
      className={`${className} ${getSizeClasses()} transition-all duration-300`}>
      {isPending ? (
        <Loader2 className={`mr-2 h-${iconSize / 4} w-${iconSize / 4} animate-spin`} />
      ) : isPublic ? (
        <Globe className={`mr-2 h-${iconSize / 4} w-${iconSize / 4}`} />
      ) : (
        <Lock className={`mr-2 h-${iconSize / 4} w-${iconSize / 4}`} />
      )}
      {isPending ? "Đang xử lý..." : isPublic ? "Công khai" : "Riêng tư"}
    </Button>
  );
};
