"use client";

import React from "react";
import { BookOpen, GraduationCap, Flame, BarChart3, Sparkles, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
// Sử dụng i18n client hook (giả định theo pattern next-intl)
// import { useTranslations } from "next-intl";

import { StatsOverview, LearningHeatmap, ReviewForecast } from "@/features/vocabulary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useUserStats, useHeatmap, useReviewForecast } from "@/features/vocabulary/api";
import { useDueCount } from "@/features/vocabulary/api/use-decks";

export default function VocabularyDashboardPage() {
  // const t = useTranslations("vocabulary"); // Tuân thủ mục 8.1
  const params = useParams();
  const locale = params.locale as string;
  const role = params.role as string;
  const baseUrl = `/${locale}/${role}/vocabulary`;

  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useUserStats();
  const { data: heatmap, isLoading: isLoadingHeatmap } = useHeatmap();
  const { data: forecast, isLoading: isLoadingForecast } = useReviewForecast();
  const { data: dueCountData } = useDueCount();

  const isLoading = isLoadingStats || isLoadingHeatmap || isLoadingForecast;

  // --- 1. Loading State (Đồng bộ với mục 4.1 Skeleton) ---
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // --- 2. Empty State ---
  if (isErrorStats || !stats || stats.totalWords === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative h-20 w-20 glass border-input rounded-3xl flex items-center justify-center text-primary shadow-xl">
            <BookOpen size={40} strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Sẵn sàng chinh phục?</h1>
        <p className="text-muted-foreground max-w-sm mb-8">Thư viện của bạn đang chờ những từ vựng đầu tiên.</p>
        <div className="flex gap-4">
          <Button asChild size="lg" className="rounded-xl shadow-lg shadow-primary/20">
            <Link href={`${baseUrl}/decks`}>Khám phá ngay</Link>
          </Button>
        </div>
      </div>
    );
  }

  const dueCount = dueCountData?.dueCount ?? 0;

  return (
    <div className="container mx-auto py-6 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* --- Header Section --- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest opacity-70">
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Vocabulary <span className="text-primary">Center</span>
          </h1>
        </div>

        <Button asChild size="lg" className="rounded-2xl shadow-xl shadow-primary/20 group">
          <Link href={`${baseUrl}/my-decks`} className="flex items-center gap-2">
            <Flame size={18} className="text-orange-400 group-hover:animate-bounce" />
            Ôn tập ngay
            {dueCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground">
                {dueCount}
              </Badge>
            )}
          </Link>
        </Button>
      </header>

      {/* --- Section 1: Stats --- */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Năng lực cốt lõi</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <StatsOverview stats={stats} />
      </section>

      {/* --- Section 2: Charts (Mục 5 & 6.3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Sparkles size={16} className="text-orange-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hoạt động</span>
          </div>
          <div className="glass-panel p-6 border-border/50">
            <LearningHeatmap data={heatmap || {}} />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <BarChart3 size={16} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dự báo SRS</span>
          </div>
          <div className="glass-panel p-6 border-border/50 h-full">
            {forecast && <ReviewForecast forecast={forecast} />}
          </div>
        </div>
      </div>
    </div>
  );
}
