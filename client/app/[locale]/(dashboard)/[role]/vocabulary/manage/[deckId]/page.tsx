"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Settings2, Layers, BarChart3, FileDown, BookOpen } from "lucide-react";

// API & Types
import { useDeckDetails } from "@/features/vocabulary/api/use-management";
import { DeckForm } from "@/features/vocabulary/components/management/deck-form";
import { CardManager } from "@/features/vocabulary/components/management/card-manager";
import { BulkImportForm } from "@/features/vocabulary/components/management/bulk-import-form";
import { DeckAnalytics } from "@/features/vocabulary/components/management/deck-analytics";

// UI Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // 1. API Hooks
  const { data: deck, isLoading: isLoadingDeck } = useDeckDetails(deckId);

  // 2. Loading State
  if (isLoadingDeck) {
    return (
      <div className="space-y-6 pt-4 px-2">
        <Button variant="ghost" disabled className="rounded-full -ml-2 opacity-50">
          <ChevronLeft className="mr-1 h-4 w-4" /> Quay lại
        </Button>
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <Skeleton className="h-12 w-64 rounded-xl" />
            <Skeleton className="h-6 w-96 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-12 w-32 rounded-2xl" />
            <Skeleton className="h-12 w-32 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-125 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  if (!deck) return null;

  // Xử lý an toàn cho TS về số lượng thẻ
  const totalCards = deck.cards?.length ?? 0;

  return (
    <div className="space-y-8 pt-4 pb-20 px-2">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(backUrl)}
          className="w-fit rounded-full -ml-2 font-bold text-muted-foreground hover:text-primary transition-all">
          <ChevronLeft className="mr-1 h-4 w-4" /> Quay lại danh sách
        </Button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight">{deck.title}</h1>
              <Badge className="bg-primary/10 text-primary border-none rounded-lg font-black px-3 py-1">
                {totalCards} Thẻ
              </Badge>
            </div>
            <p className="text-muted-foreground font-medium max-w-2xl line-clamp-2">
              {deck.description || "Chưa có mô tả cho bộ thẻ này."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Bulk Import */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-2xl font-bold border-2 h-12 px-6 hover:bg-primary hover:text-white hover:border-primary transition-all">
                  <FileDown className="mr-2 h-4 w-4" /> Nhập file / AI
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] max-w-2xl p-8 border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black">Nhập liệu thông minh</DialogTitle>
                  <DialogDescription className="font-medium text-base">
                    Hệ thống sẽ sử dụng AI để tự động tra cứu nghĩa, phiên âm và ví dụ cho danh sách từ của bạn.
                  </DialogDescription>
                </DialogHeader>
                <BulkImportForm deckId={deckId} />
              </DialogContent>
            </Dialog>

            {/* General Settings */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="rounded-2xl font-bold h-12 px-6">
                  <Settings2 className="mr-2 h-4 w-4" /> Cài đặt chung
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] max-w-lg p-8 border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black">Thông tin bộ thẻ</DialogTitle>
                </DialogHeader>
                <DeckForm initialData={deck} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Tabs System */}
      <Tabs defaultValue="cards" className="space-y-6">
        <TabsList className="bg-muted/50 p-1.5 rounded-[1.25rem] h-16 w-fit border shadow-sm">
          <TabsTrigger
            value="cards"
            className="rounded-xl px-8 h-full font-bold text-base data-[state=active]:shadow-md data-[state=active]:bg-background">
            <Layers className="mr-2 h-5 w-5" /> Nội dung thẻ
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-xl px-8 h-full font-bold text-base data-[state=active]:shadow-md data-[state=active]:bg-background">
            <BarChart3 className="mr-2 h-5 w-5" /> Thống kê học tập
          </TabsTrigger>
        </TabsList>

        {/* Card Management Tab */}
        <TabsContent value="cards" className="outline-none">
          <div className="bg-card border rounded-[2.5rem] shadow-sm overflow-hidden min-h-100">
            <div className="p-8 border-b bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-black text-2xl tracking-tight">Từ vựng trong bộ thẻ</h3>
              </div>
            </div>
            {/* CardManager fetches its own data using useDeckDetails */}
            <CardManager deckId={deckId} />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="outline-none">
          <div className="bg-card border rounded-[2.5rem] p-8 shadow-sm">
            <DeckAnalytics deckId={deckId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
