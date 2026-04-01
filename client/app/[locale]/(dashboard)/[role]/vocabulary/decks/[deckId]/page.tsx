"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeckPreview } from "@/features/vocabulary/components/public/deck-preview";
import { useDeckPreview } from "@/features/vocabulary/api";

/**
 * PAGE: Deck Preview
 * Đồng bộ hóa với ngôn ngữ thiết kế Glassmorphism & Modern Typography
 */
export default function DeckPreviewPage() {
  const params = useParams();
  const router = useRouter();

  const deckId = params?.deckId as string;
  const locale = params?.locale as string;
  const role = params?.role as string;

  const { data: deck, isLoading, isError, refetch } = useDeckPreview(deckId);

  // --- 1. Loading State (Đồng bộ hiệu ứng Glow) ---
  if (isLoading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[75vh] overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full scale-50 animate-pulse" />

        <div className="relative mb-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary/10 stroke-[1]" />
          <Loader2 className="h-16 w-16 animate-spin text-primary absolute top-0 left-0 [animation-delay:-0.3s] stroke-[3]" />
        </div>

        <div className="space-y-2 text-center relative">
          <p className="text-primary font-black tracking-[0.3em] uppercase text-[10px] animate-pulse">Spackie Studio</p>
          <p className="text-muted-foreground/60 font-bold text-sm">Đang chuẩn bị dữ liệu giới thiệu...</p>
        </div>
      </div>
    );
  }

  // --- 2. Error State (Đồng bộ phong cách Content-only) ---
  if (isError || !deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-destructive/10 blur-[60px] rounded-full" />
          <AlertCircle size={80} strokeWidth={0.5} className="relative text-destructive/40" />
        </div>

        <h1 className="text-3xl font-black tracking-tighter mb-3">Không tìm thấy nội dung</h1>
        <p className="text-muted-foreground max-w-sm mb-12 font-medium opacity-80">
          Có vẻ như đường dẫn này không tồn tại hoặc tác giả đã chuyển bộ thẻ sang chế độ riêng tư.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-none justify-center">
          <Button
            variant="ghost"
            onClick={() => router.push(`/${locale}/${role}/vocabulary/decks`)}
            className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest glass border-primary/5 cursor-pointer px-8">
            <ArrowLeft className="mr-2 h-4 w-4 stroke-[3]" /> Khám phá bộ khác
          </Button>
          <Button
            onClick={() => refetch()}
            className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer px-8">
            Thử lại ngay
          </Button>
        </div>
      </div>
    );
  }

  // --- 3. Main Layout ---
  return (
    <main className="max-w-7xl mx-auto space-y-8 pb-20 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out px-1">
      {/* Nút quay lại tinh tế - Style tối giản */}
      <div className="flex items-center">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all cursor-pointer">
          <div className="h-8 w-8 rounded-full glass border-primary/5 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform stroke-[3]" />
          </div>
          <span className="font-black text-[10px] uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">
            Quay lại thư viện
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative group">
        {/* Một chút nhấn nhá phía sau component chính */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <DeckPreview deck={deck} />
      </div>
    </main>
  );
}
