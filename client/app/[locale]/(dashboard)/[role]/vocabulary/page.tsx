"use client";

import React from "react";
import { BookOpen, GraduationCap, Flame, BarChart3, Plus, Sparkles, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { StatsOverview, LearningHeatmap, ReviewForecast } from "@/features/vocabulary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStats, useHeatmap, useReviewForecast } from "@/features/vocabulary/api";

export default function VocabularyDashboardPage() {
  const params = useParams();
  const locale = params.locale as string;
  const role = params.role as string;
  const baseUrl = `/${locale}/${role}/vocabulary`;

  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useUserStats();
  const { data: heatmap, isLoading: isLoadingHeatmap } = useHeatmap();
  const { data: forecast, isLoading: isLoadingForecast } = useReviewForecast();

  const isLoading = isLoadingStats || isLoadingHeatmap || isLoadingForecast;

  // --- 1. Loading State (Đồng bộ skeleton với phong cách glass) ---
  if (isLoading) {
    return (
      <div className="space-y-10 pt-4 px-1">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-2xl bg-muted/20" />
          <Skeleton className="h-4 w-96 rounded-lg bg-muted/10" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl bg-muted/20 border border-border/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-80 rounded-[2.5rem] bg-muted/10" />
          <Skeleton className="lg:col-span-5 h-80 rounded-[2.5rem] bg-muted/10" />
        </div>
      </div>
    );
  }

  // --- 2. Empty State (Đồng bộ với Discovery Empty) ---
  if (isErrorStats || !stats || stats.totalWords === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] text-center p-6 animate-in fade-in duration-700">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full scale-150" />
          <div className="relative h-20 w-20 glass border-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-2xl">
            <BookOpen size={40} strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-3">Sẵn sàng chinh phục?</h1>
        <p className="text-muted-foreground font-medium max-w-sm mb-10 opacity-80 leading-relaxed">
          Thư viện của bạn đang chờ những từ vựng đầu tiên. Hãy bắt đầu hành trình ngay bây giờ.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            asChild
            className="h-12 px-10 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            <Link href={`${baseUrl}/decks`}>Khám phá thư viện</Link>
          </Button>
          {(role === "teacher" || role === "admin") && (
            <Button
              asChild
              variant="ghost"
              className="h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest glass border-primary/5 hover:bg-primary/5">
              <Link href={`${baseUrl}/manage`}>
                <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Tạo bộ thẻ
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-4 space-y-12 pb-20 px-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- Header Section --- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
            <LayoutDashboard size={12} fill="currentColor" className="opacity-50" />
            <span>Personal Dashboard</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl leading-none">
            Vocabulary{" "}
            <span className="bg-linear-to-r from-primary to-blue-500 bg-clip-text text-transparent">Center</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-80">
            Theo dõi tiến độ và tối ưu hóa khả năng ghi nhớ dài hạn.
          </p>
        </div>

        <Button
          asChild
          className="h-12 px-10 rounded-2xl font-black text-xs uppercase tracking-[0.15em] bg-primary shadow-[0_10px_25px_-5px_rgba(var(--primary),0.3)] hover:shadow-[0_15px_30px_-5px_rgba(var(--primary),0.4)] hover:-translate-y-1 transition-all active:scale-95 cursor-pointer">
          <Link href={`${baseUrl}/review`}>
            <Flame size={16} className="mr-2 fill-orange-400 text-orange-400 animate-pulse" /> Ôn tập ngay
          </Link>
        </Button>
      </header>

      {/* --- Section 1: Stats Overview --- */}
      <section className="space-y-5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
          <div className="h-px flex-1 bg-border/5" />
          <GraduationCap className="w-3 h-3 text-primary" />
          <span>Năng lực cốt lõi</span>
          <div className="h-px flex-1 bg-border/5" />
        </div>
        <StatsOverview stats={stats} />
      </section>

      {/* --- Section 2: Heatmap & Forecast --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Heatmap Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
              <Sparkles size={14} className="text-orange-500 fill-orange-500/20" />
              <span>Hoạt động học tập</span>
            </div>
          </div>
          <div className="glass-panel p-6! rounded-[2.5rem]! border-primary/5 shadow-sm">
            <LearningHeatmap data={heatmap || {}} />
          </div>
        </div>

        {/* Forecast Area */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
            <BarChart3 size={14} className="text-blue-500" />
            <span>Dự báo SRS</span>
          </div>
          <div className="glass-panel p-6! rounded-[2.5rem]! border-primary/5 shadow-sm h-full">
            {forecast && <ReviewForecast forecast={forecast} />}
          </div>
        </div>
      </div>
    </div>
  );
}
