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

  // 1. Tính toán thống kê sử dụng useMemo để tối ưu hiệu suất
  const statsSummary = useMemo(() => {
    const total = results.length;
    if (total === 0) return { total: 0, mastered: 0, learning: 0, accuracy: 0 };

    // Đã thuộc: rating >= 3 (Good/Easy) hoặc status MASTERED
    const mastered = results.filter((r) => r.rating >= 3 || r.status === CardStatus.MASTERED).length;

    // Cần cố gắng: rating <= 2 (Again/Hard)
    const learning = results.filter((r) => r.rating <= 2).length;

    const accuracy = Math.round((mastered / total) * 100);

    return { total, mastered, learning, accuracy };
  }, [results]);

  const statsDisplay = [
    {
      label: "Đã hoàn thành",
      value: statsSummary.total,
      icon: CheckCircle2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Đã thuộc lòng",
      value: statsSummary.mastered,
      icon: Star,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Cần cố gắng",
      value: statsSummary.learning,
      icon: Zap,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const handleSelectExtraMode = (mode: string) => {
    setIsExtraModalOpen(false);

    // Lấy thông tin locale/role từ URL hiện tại
    const locale = params.locale || "vi";
    const role = params.role || "student";

    // Điều hướng kèm theo deckId và mode để trang Review lọc card
    // mode có thể là: 'all' | 'hard_only' | 'shuffled'
    router.push(`/${locale}/${role}/vocabulary/review?deckId=${deckId}&mode=${mode}`);
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-10 animate-in fade-in zoom-in duration-500">
      {/* Header với hiệu ứng ăn mừng */}
      <div className="text-center mb-10 space-y-4">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 animate-pulse" />
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-linear-to-br from-yellow-100 to-orange-100 shadow-inner border border-yellow-200">
            <Trophy className="w-12 h-12 text-yellow-600 drop-shadow-md animate-bounce" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Chúc mừng bạn!</h1>
          <p className="text-muted-foreground font-medium text-lg">Bạn vừa hoàn thành mục tiêu học tập hôm nay.</p>
        </div>
      </div>

      {/* Accuracy & Stats Card */}
      <Card className="mb-10 border-none shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm overflow-hidden border border-border">
        <CardContent className="p-0">
          <div className="bg-primary px-8 py-10 text-primary-foreground relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-1">Chỉ số ghi nhớ</p>
                <h2 className="text-6xl font-black tracking-tighter tabular-nums">{statsSummary.accuracy}%</h2>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            {/* Background Decoration */}
            <BarChart3 className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
          </div>

          <div className="grid grid-cols-3 divide-x divide-border bg-card">
            {statsDisplay.map((stat, i) => (
              <div key={i} className="p-6 text-center hover:bg-muted/30 transition-colors">
                <div className={cn("inline-flex p-3 rounded-xl mb-3", stat.bgColor)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-black tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="default"
          size="lg"
          className="flex-1 h-16 text-lg font-black shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
          onClick={() => setIsExtraModalOpen(true)}>
          <RotateCcw className="mr-2 h-6 w-6" /> Học thêm (Review)
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="flex-1 h-16 text-lg font-bold border-2"
          onClick={() => router.push(`/${params.locale}/${params.role}/vocabulary`)}>
          <ArrowLeft className="mr-2 h-5 w-5" /> Về Dashboard
        </Button>
      </div>

      <div className="mt-12 text-center">
        <div className="inline-block px-4 py-2 rounded-full bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest border border-border">
          Hẹn gặp lại bạn vào ngày mai!
        </div>
      </div>

      {/* Modal lựa chọn chế độ học thêm */}
      <ExtraStudyModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        onSelectMode={handleSelectExtraMode}
      />
    </div>
  );
};
