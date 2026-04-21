"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Settings2, BookOpen, BarChart3, Sparkles, Plus } from "lucide-react";

// API & Types
import { useDeckDetails } from "@/features/vocabulary/api/use-management";
import { DeckForm } from "@/features/vocabulary/components/management/deck-form";
import { CardManager } from "@/features/vocabulary/components/management/card-manager";
import { BulkImportForm } from "@/features/vocabulary/components/management/bulk-import-form";
import { DeckAnalytics } from "@/features/vocabulary/components/management/deck-analytics";

// UI Components (shadcn/ui)
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();

  const deckId = params?.deckId as string;
  const locale = params?.locale as string;
  const role = params?.role as string;
  const backUrl = `/${locale}/${role}/vocabulary/manage`;

  const { data: deck, isLoading: isLoadingDeck } = useDeckDetails(deckId);

  // Loading State
  if (isLoadingDeck) {
    return (
      <div className="container mx-auto space-y-8 py-6 px-4">
        <Skeleton className="h-10 w-32" />
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-80" />
            <Skeleton className="h-6 w-[500px]" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 w-36" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl mt-8" />
      </div>
    );
  }

  if (!deck) return null;
  const totalCards = deck.cards?.length ?? 0;

  return (
    <div className="container mx-auto space-y-12 py-6 pb-20 px-4">
      {/* Header & Navigation */}
      <header className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push(backUrl)}
          className="group pl-2 pr-5 text-muted-foreground hover:text-primary hover:bg-accent transition-all">
          <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Quay lại
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{deck.title}</h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-semibold px-3 py-1">
                {totalCards} Vocabs
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl text-base">
              {deck.description || "Chưa có mô tả cho bộ thẻ này."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI Bulk Import */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm">
                  <Sparkles className="h-4 w-4" /> AI Import
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
                <div className="bg-muted/30 p-6 border-b">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" /> Nhập liệu thông minh
                    </DialogTitle>
                    <DialogDescription>Sử dụng trí tuệ nhân tạo để tra cứu tự động</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="p-6">
                  <BulkImportForm deckId={deckId} />
                </div>
              </DialogContent>
            </Dialog>

            {/* General Settings */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings2 className="h-4 w-4" /> Cài đặt
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Cấu hình bộ thẻ</DialogTitle>
                </DialogHeader>
                <DeckForm initialData={deck} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Phần 1: Quản lý thẻ */}
      <section className="space-y-4">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xl tracking-tight">Thư viện từ vựng</h3>
                <p className="text-sm text-muted-foreground">Quản lý và chỉnh sửa các thẻ trong bộ này</p>
              </div>
            </div>
            <Button size="default" className="gap-1">
              <Plus className="h-4 w-4" /> Thêm thẻ mới
            </Button>
          </div>
          <div className="p-4 sm:p-6">
            <CardManager deckId={deckId} />
          </div>
        </div>
      </section>

      {/* Phần 2: Thống kê */}
      <section className="space-y-4">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xl tracking-tight">Thống kê & Tiến độ</h3>
                <p className="text-sm text-muted-foreground">Phân tích hiệu suất học tập của bạn</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DeckAnalytics deckId={deckId} />
          </div>
        </div>
      </section>
    </div>
  );
}
