"use client";

import React, { useState, useMemo } from "react";
import { CheckCircle2, Trophy, BarChart3, ArrowLeft, RotateCcw, Star, Zap, Brain } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExtraStudyModal } from "./extra-study-modal";
import { SyncSessionInput } from "../../schemas";
import { CardStatus } from "../../types";
import { cn } from "@/lib/utils";

interface SessionCompleteProps {
  results: SyncSessionInput["results"];
  deckId: string;
}

export const SessionComplete = ({ results, deckId }: SessionCompleteProps) => {
  const router = useRouter();
  const params = useParams();
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);

  // Tính toán thống kê
  const statsSummary = useMemo(() => {
    const total = results.length;
    if (total === 0) return { total: 0, mastered: 0, learning: 0, accuracy: 0 };

    const mastered = results.filter((r) => r.rating >= 3 || r.status === CardStatus.MASTERED).length;
    const learning = results.filter((r) => r.rating <= 2).length;
    const accuracy = Math.round((mastered / total) * 100);

    return { total, mastered, learning, accuracy };
  }, [results]);

  const statsDisplay = [
    {
      label: "Đã hoàn thành",
      value: statsSummary.total,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/15",
    },
    {
      label: "Đã thuộc lòng",
      value: statsSummary.mastered,
      icon: Star,
      color: "text-success",
      bgColor: "bg-success/15",
    },
    {
      label: "Cần cố gắng",
      value: statsSummary.learning,
      icon: Zap,
      color: "text-warning",
      bgColor: "bg-warning/15",
    },
  ];

  const handleSelectExtraMode = (mode: string) => {
    setIsExtraModalOpen(false);
    const locale = params.locale || "vi";
    const role = params.role || "student";
    router.push(`/${locale}/${role}/vocabulary/review?deckId=${deckId}&mode=${mode}`);
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 space-y-3 sm:space-y-4">
        <div className="relative inline-flex">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Chúc mừng bạn!</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Bạn vừa hoàn thành mục tiêu học tập hôm nay.
          </p>
        </div>
      </div>

      {/* Accuracy & Stats Card */}
      <Card className="mb-6 sm:mb-8 border-none shadow-xl overflow-hidden glass dark:glass-dark rounded-[var(--radius-3xl)]">
        <CardContent className="p-0">
          <div className="bg-primary/90 px-5 sm:px-6 py-6 sm:py-8 text-primary-foreground relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                  Chỉ số ghi nhớ
                </p>
                <h2 className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight">
                  {statsSummary.accuracy}%
                </h2>
              </div>
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <BarChart3 className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10 rotate-12" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/30 bg-background/30 backdrop-blur-sm">
            {statsDisplay.map((stat, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 text-center flex flex-row sm:flex-col items-center justify-between sm:justify-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                  <div className={cn("inline-flex p-2 rounded-xl sm:mb-2", stat.bgColor)}>
                    <stat.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", stat.color)} />
                  </div>
                  <p className="text-xs sm:text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button
          variant="default"
          size="lg"
          className="flex-1 h-12 sm:h-14 text-sm sm:text-base font-bold shadow-md rounded-xl"
          onClick={() => setIsExtraModalOpen(true)}>
          <RotateCcw className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Học thêm (Review)
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="flex-1 h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-xl bg-background/50 backdrop-blur-sm"
          onClick={() => router.push(`/${params.locale}/${params.role}/vocabulary`)}>
          <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Về Dashboard
        </Button>
      </div>

      <div className="mt-8 sm:mt-10 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full glass text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          Hẹn gặp lại bạn vào ngày mai!
        </div>
      </div>

      <ExtraStudyModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        onSelectMode={handleSelectExtraMode}
      />
    </div>
  );
};
