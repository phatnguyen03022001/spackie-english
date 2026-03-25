"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { DeckEnrollCard } from "@/features/vocabulary/components/learning/deck-enroll-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/features/vocabulary/hooks/index";
import { Deck } from "@/features/vocabulary/types";

export default function PublicDecksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // 1. Lấy danh sách bộ thẻ công khai
  // Lưu ý: data ở đây chính là Deck[] vì vocabApi đã return res.data.data
  const { data: publicDecks, isLoading: isLoadingPublic } = useQuery<Deck[]>({
    queryKey: ["public-decks", debouncedSearch],
    queryFn: () => vocabApi.getPublicDecks(debouncedSearch),
  });

  // 2. Lấy danh sách bộ thẻ gợi ý
  const { data: recommendedDecks, isLoading: isLoadingRecommended } = useQuery<Deck[]>({
    queryKey: ["recommended-decks"],
    queryFn: () => vocabApi.getRecommendedDecks(),
  });

  // 3. Lấy danh sách bộ thẻ ĐÃ ĐĂNG KÝ
  const { data: enrolledDecks } = useQuery<Deck[]>({
    queryKey: ["my-enrolled-decks"],
    queryFn: () => vocabApi.getMyEnrolledDecks(),
  });

  // So khớp ID (Dùng mảng trực tiếp, không cần .data nữa)
  const enrolledIds = useMemo(() => {
    const list = enrolledDecks || []; // Bỏ .data ở đây
    return new Set<string>(list.map((d) => d.id));
  }, [enrolledDecks]);

  // Render logic
  const displayPublic = publicDecks || [];
  const displayRecommended = recommendedDecks || [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Thư viện bộ thẻ</h1>
        <p className="text-muted-foreground">Khám phá các bộ từ vựng được chia sẻ từ cộng đồng.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm bộ thẻ..."
          className="pl-10"
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Tất cả
          </TabsTrigger>
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Gợi ý
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoadingPublic ? (
            <DeckGridSkeleton count={6} />
          ) : displayPublic.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayPublic.map((deck) => (
                <DeckEnrollCard key={deck.id} deck={deck} isEnrolled={enrolledIds.has(deck.id)} />
              ))}
            </div>
          ) : (
            <EmptyState message={debouncedSearch ? `Không tìm thấy "${debouncedSearch}"` : "Chưa có bộ thẻ nào."} />
          )}
        </TabsContent>

        <TabsContent value="recommended" className="mt-6">
          {isLoadingRecommended ? (
            <DeckGridSkeleton count={3} />
          ) : displayRecommended.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayRecommended.map((deck) => (
                <DeckEnrollCard key={deck.id} deck={deck} isEnrolled={enrolledIds.has(deck.id)} />
              ))}
            </div>
          ) : (
            <EmptyState message="Hoàn thành bài học để nhận gợi ý!" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeckGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
