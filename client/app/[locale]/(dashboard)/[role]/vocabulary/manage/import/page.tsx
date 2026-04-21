"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Languages, AlertCircle, Sparkles, ArrowLeft, Zap, Globe } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useBulkImport } from "@/features/vocabulary/api/use-management";

export default function BulkImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");

  const [rawText, setRawText] = useState("");
  const bulkImport = useBulkImport();

  useEffect(() => {
    if (!deckId) {
      toast.error("Không tìm thấy bộ thẻ. Đang quay lại trang quản lý...");
      const timer = setTimeout(() => router.push("../manage"), 1500);
      return () => clearTimeout(timer);
    }
  }, [deckId, router]);

  // --- 1. Loading State (Tuân thủ mục 4.1 & 10) ---
  if (!deckId) {
    return (
      <div className="container max-w-3xl py-10 space-y-8 animate-pulse">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-md rounded-lg" />
        </div>
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-primary/5">
          <CardHeader className="bg-muted/30 pb-12">
            <Skeleton className="h-8 w-48 rounded-xl" />
          </CardHeader>
          <CardContent className="pt-8">
            <Skeleton className="h-[300px] w-full rounded-[2rem]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImport = async () => {
    const words = rawText
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      toast.error("Vui lòng nhập ít nhất một từ vựng.");
      return;
    }

    if (words.length > 30) {
      toast.error("Tối đa 30 từ mỗi lần để đảm bảo chất lượng AI.");
      return;
    }

    try {
      const result = await bulkImport.mutateAsync({ deckId, words });
      toast.success(`Thành công! Đã thêm ${result.addedCount} từ vựng mới.`);
      router.push(`../manage/${deckId}`);
    } catch {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="container max-w-3xl py-10 space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- Header (Tuân thủ mục 6.1) --- */}
      <header className="space-y-2 px-1">
        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
          <Zap size={12} fill="currentColor" />
          <span>AI Power Assisted</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight">
          Import <span className="text-primary">hàng loạt</span>
        </h1>
        <p className="text-muted-foreground font-medium text-sm max-w-lg leading-relaxed">
          Tiết kiệm thời gian bằng cách nhập danh sách từ. AI của chúng tôi sẽ tự động hoàn thiện nghĩa, phiên âm và ví
          dụ.
        </p>
      </header>

      {/* --- Main Import Card (Tuân thủ mục 5 & 6.3) --- */}
      <Card className="rounded-[2.5rem] border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden glass-panel">
        <CardHeader className="bg-primary/[0.03] border-b border-primary/5 pb-8 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Languages className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Danh sách từ</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest opacity-60">
                  Mỗi từ nằm trên một dòng riêng biệt
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full border-primary/20 font-black text-[10px] px-3">
              {rawText.split("\n").filter((t) => t.trim()).length}/30 TỪ
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-primary/20 to-blue-500/20 rounded-[1.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <Textarea
              placeholder="Ví dụ:&#10;Effortless&#10;Consistency&#10;Breakthrough..."
              className="relative min-h-[320px] text-lg font-bold rounded-[1.5rem] border-primary/10 bg-background/50 focus-visible:ring-primary focus-visible:border-primary p-8 transition-all resize-none shadow-inner"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={bulkImport.isPending}
            />
          </div>

          <div className="mt-6 flex items-start gap-3 p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-200/50 dark:border-orange-900/30">
            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-orange-700/80 dark:text-orange-400/80 leading-relaxed">
              Lưu ý: Hệ thống sẽ tự động bỏ qua các từ đã có trong bộ thẻ. Tối đa 30 từ để đảm bảo độ chính xác cao nhất
              cho dữ liệu AI.
            </p>
          </div>
        </CardContent>

        <CardFooter className="bg-primary/[0.02] border-t border-primary/5 p-8 flex justify-between items-center">
          <Button
            variant="ghost"
            className="rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/5"
            onClick={() => router.back()}
            disabled={bulkImport.isPending}>
            <ArrowLeft className="mr-2 h-4 w-4 stroke-[3]" />
            Quay lại
          </Button>

          <Button
            onClick={handleImport}
            disabled={bulkImport.isPending || !rawText.trim()}
            className="rounded-2xl font-black text-xs uppercase tracking-[0.15em] px-10 h-14 bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
            {bulkImport.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang xử lý AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5 fill-white/20" />
                Bắt đầu Import
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* --- Feature Badges (Tuân thủ mục 6.2 & 6.3) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-1">
        <div className="flex items-center gap-4 p-5 rounded-3xl glass-panel border-blue-500/10">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Globe size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest">Nguồn từ điển</h4>
            <p className="text-xs text-muted-foreground font-medium">Tích hợp Oxford & Cambridge</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-3xl glass-panel border-green-500/10">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest">Tự động hóa</h4>
            <p className="text-xs text-muted-foreground font-medium">IPA & Audio chuẩn bản ngữ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
