"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Layers, Calendar, Globe, Lock, CheckCircle2, PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function DeckPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const deckId = params.deckId as string;
  const role = params.role as string;

  // 1. Lấy thông tin xem trước của bộ thẻ (Deck + Cards)
  const { data, isLoading, error } = useQuery({
    queryKey: ["deck-preview", deckId],
    queryFn: () => vocabApi.getDeckPreview(deckId),
    enabled: !!deckId,
  });

  // 2. Kiểm tra xem người dùng đã đăng ký bộ thẻ này chưa
  // (Dựa vào danh sách enrolled-decks đã fetch ở Dashboard)
  const { data: enrolledDecks } = useQuery({
    queryKey: ["enrolled-decks"],
    queryFn: () => vocabApi.getMyEnrolledDecks(),
  });

  const isEnrolled = enrolledDecks?.some((d) => d.id === deckId);

  // 3. Mutation: Đăng ký học
  const enrollMutation = useMutation({
    mutationFn: () => vocabApi.enrollDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrolled-decks"] });
      toast.success("Đã đăng ký bộ thẻ thành công!");
    },
    onError: () => toast.error("Không thể đăng ký bộ thẻ này"),
  });

  if (isLoading) return <DeckPreviewSkeleton />;
  if (error || !data) return <div className="text-center py-20">Không tìm thấy bộ thẻ.</div>;

  const deck = data;
  const cards = data?.cards || [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Nút quay lại */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI: THÔNG TIN CHI TIẾT */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-2 py-0">
                {deck.levelTag || "General"}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                {deck.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {deck.isPublic ? "Công khai" : "Riêng tư"}
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight">{deck.title}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {deck.description || "Chưa có mô tả chi tiết cho bộ thẻ này."}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                <Layers className="h-4 w-4 text-primary" />
                <span className="font-medium">{cards.length} thẻ ghi nhớ</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>
                  Cập nhật:{" "}
                  {deck.updatedAt ? format(new Date(deck.updatedAt), "dd MMMM, yyyy", { locale: vi }) : "Vừa mới đây"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Danh sách từ vựng ({cards.length})
            </h2>
            <div className="grid gap-3">
              {cards.map((card) => {
                // Tìm nghĩa tiếng Việt (thường là phần người dùng quan tâm nhất ở trang Preview)
                const vnMeaning = card.meanings.find((m) => m.partOfSpeech === "Vietnamese") || card.meanings[0];

                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors flex justify-between items-center group">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-foreground">{card.word}</span>
                        <span className="text-sm text-muted-foreground italic font-serif">{card.phonetic}</span>
                      </div>
                      <p className="text-sm text-primary font-medium mt-1">
                        {vnMeaning?.definitions[0]?.definition || "Chưa có định nghĩa"}
                      </p>
                    </div>
                    <PlusCircle className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-all" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: HÀNH ĐỘNG (Sticky) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Bắt đầu học ngay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Đăng ký bộ thẻ này để thuật toán SM-2 giúp bạn ghi nhớ từ vựng vĩnh viễn qua các phiên ôn tập hàng ngày.
              </p>

              {isEnrolled ? (
                <div className="space-y-3">
                  <Button className="w-full gap-2" variant="secondary" disabled>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Đã đăng ký học
                  </Button>
                  <Button className="w-full" onClick={() => router.push(`/${role}/vocabulary/review?deckId=${deckId}`)}>
                    Vào học ngay
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={enrollMutation.isPending}
                  onClick={() => enrollMutation.mutate()}>
                  {enrollMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                  Đăng ký bộ thẻ
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DeckPreviewSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <Skeleton className="h-10 w-24" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="space-y-2 pt-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
