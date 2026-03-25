"use client";

import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewActionsProps {
  onAnswer: (grade: 1 | 2 | 3 | 4, responseTime: number) => void;
  isFlipped: boolean;
  isWrong?: boolean;
}

export function ReviewActions({ onAnswer, isFlipped, isWrong }: ReviewActionsProps) {
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (isFlipped) {
      startTime.current = Date.now();
    }
  }, [isFlipped]);

  const handlePress = useCallback(
    (grade: 1 | 2 | 3 | 4) => {
      const start = startTime.current ?? Date.now();
      const responseTime = Date.now() - start;
      onAnswer(grade, responseTime);
    },
    [onAnswer],
  );

  // --- LOGIC PHÍM TẮT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chỉ nhận phím tắt khi thẻ đã được lật (Mặt sau)
      if (!isFlipped) return;

      // Tránh xung đột nếu người dùng đang gõ vào một input nào đó (hiếm gặp ở màn hình này)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "1":
          handlePress(1);
          break;
        case "2":
          if (!isWrong) handlePress(2);
          break;
        case "3":
          if (!isWrong) handlePress(3);
          break;
        case "4":
          if (!isWrong) handlePress(4);
          break;
        case " ": // Phím Space
        case "Enter":
          e.preventDefault();
          // Nếu gõ sai thì Space/Enter sẽ là Again (1), nếu đúng thì mặc định là Good (3)
          handlePress(isWrong ? 1 : 3);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, isWrong, handlePress]);

  if (!isFlipped) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Nút AGAIN (Phím 1) */}
      <Button
        variant="destructive"
        className={cn(
          "flex flex-col h-16 transition-all duration-300 relative group",
          isWrong ? "col-span-2 md:col-span-4 shadow-xl scale-105" : "",
        )}
        onClick={() => handlePress(1)}>
        <span className="font-bold">{isWrong ? "Tiếp tục (Học lại)" : "Again"}</span>
        <span className="text-[10px] opacity-70">Phím [1] hoặc [Space]</span>
      </Button>

      {!isWrong && (
        <>
          {/* Nút HARD (Phím 2) */}
          <Button
            variant="secondary"
            className="flex flex-col h-16 bg-orange-100 hover:bg-orange-200 text-orange-700 border-none"
            onClick={() => handlePress(2)}>
            <span className="font-bold">Hard</span>
            <span className="text-[10px] opacity-70 text-orange-600/80">Phím [2]</span>
          </Button>

          {/* Nút GOOD (Phím 3) */}
          <Button
            variant="secondary"
            className="flex flex-col h-16 bg-green-100 hover:bg-green-200 text-green-700 border-none"
            onClick={() => handlePress(3)}>
            <span className="font-bold">Good</span>
            <span className="text-[10px] opacity-70 text-green-600/80">Phím [3]</span>
          </Button>

          {/* Nút EASY (Phím 4) */}
          <Button
            variant="default"
            className="flex flex-col h-16 bg-blue-600 hover:bg-blue-700 border-none"
            onClick={() => handlePress(4)}>
            <span className="font-bold">Easy</span>
            <span className="text-[10px] opacity-70 text-blue-100/80">Phím [4]</span>
          </Button>
        </>
      )}
    </div>
  );
}
