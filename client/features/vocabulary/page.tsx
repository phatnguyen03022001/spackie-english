"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { StatsOverview } from "@/features/vocabulary/components/dashboard/stats-overview";
import { LearningHeatmap } from "@/features/vocabulary/components/dashboard/learning-heatmap";
import { DeckEnrollCard } from "@/features/vocabulary/components/learning/deck-enroll-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, LayoutGrid, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function VocabularyDashboardPage() {
  const params = useParams();
  const locale = params.locale as string;
  const role = params.role as string;

  // Base path để điều hướng đúng theo locale và role
  const basePath = `/${locale}/${role}/vocabulary`;

  // 1. Lấy thống kê tổng quan (Mastery rate, Status distribution)
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["vocab-stats"],
    queryFn: vocabApi.getDashboardStats,
  });

  // 2. Lấy dữ liệu biểu đồ nhiệt (Hoạt động học tập)
  const { data: heatmapData, isLoading: isLoadingHeatmap } = useQuery({
    queryKey: ["vocab-heatmap"],
    queryFn: vocabApi.getHeatmap,
  });

  // 3. Lấy danh sách bộ thẻ đã đăng ký (Enrolled Decks)
  const { data: enrolledDecks, isLoading: isLoadingDecks } = useQuery({
    queryKey: ["enrolled-decks"],
    queryFn: vocabApi.getMyEnrolledDecks,
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Học từ vựng</h1>
          <p className="text-muted-foreground">Theo dõi tiến độ và ôn tập thẻ ghi nhớ của bạn.</p>
        </div>
        <Link href={`${basePath}/review`}>
          <Button size="lg" className="w-full md:w-auto gap-2">
            <PlayCircle className="h-5 w-5" />
            Bắt đầu ôn tập ngay
          </Button>
        </Link>
      </div>

      {/* SECTION 1: STATS OVERVIEW (getDashboardStats) */}
      <section>
        {isLoadingStats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          stats && <StatsOverview stats={stats} />
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* SECTION 2: LEARNING HEATMAP (getHeatmap) */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Lịch sử học tập
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHeatmap ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <LearningHeatmap data={heatmapData || []} />
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: QUICK STATS / GOALS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mục tiêu hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="text-5xl font-extrabold text-primary">{stats?.cardsToReviewToday || 0}</div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Thẻ cần được ôn tập lại dựa trên thuật toán SM-2.
            </p>
            <Link href={`${basePath}/review`} className="w-full">
              <Button variant="outline" className="w-full">
                Xem danh sách ôn tập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4: MY ENROLLED DECKS (getMyEnrolledDecks) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Bộ thẻ của tôi
          </h2>
          <Link href={`${basePath}/decks`}>
            <Button variant="ghost" className="text-primary">
              Khám phá thêm
            </Button>
          </Link>
        </div>

        {isLoadingDecks ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : enrolledDecks && enrolledDecks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledDecks.map((deck) => (
              <DeckEnrollCard key={deck.id} deck={deck} isEnrolled={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">Bạn chưa đăng ký bộ thẻ nào.</p>
            <Link href={`${basePath}/decks`} className="mt-4 inline-block">
              <Button variant="secondary">Tìm bộ thẻ phù hợp</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
