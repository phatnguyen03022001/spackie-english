"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, BookCopy, Filter, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams, useRouter, useParams } from "next/navigation";

import { usePublicDecks } from "@/features/vocabulary/api";
import { Deck, DeckDiscovery, DifficultyLevel } from "@/features/vocabulary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// --- 1. SearchInput chuẩn hóa kích thước ---
const SearchInput = ({
  defaultValue,
  onSearch,
  isFetching,
  levelQuery,
  updateFilters,
}: {
  defaultValue: string;
  onSearch: (val: string) => void;
  isFetching?: boolean;
  levelQuery: string;
  updateFilters: (updates: Record<string, string | number | undefined>) => void;
}) => {
  const [localValue, setLocalValue] = useState(defaultValue);

  useEffect(() => {
    setLocalValue(defaultValue);
  }, [defaultValue]);

  return (
    <div className="group relative flex flex-col md:flex-row items-center gap-2 p-1.5 glass-panel rounded-2xl! border-primary/10 shadow-xl shadow-primary/5 focus-within:border-primary/30 transition-all duration-300">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Tìm kiếm bộ thẻ..."
          className="pl-11 h-11 bg-transparent border-none focus-visible:ring-0 text-sm font-medium placeholder:text-muted-foreground/50 shadow-none"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch(localValue)}
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
          </div>
        )}
      </div>

      <Separator orientation="vertical" className="hidden md:block h-6 bg-border/20" />

      <Select value={levelQuery} onValueChange={(val) => updateFilters({ level: val })}>
        <SelectTrigger className="w-full md:w-40 h-11 bg-transparent border-none focus:ring-0 text-sm font-bold hover:bg-primary/5 rounded-xl transition-all shadow-none px-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-primary/60" />
            <SelectValue placeholder="Trình độ" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl glass border-primary/10 shadow-2xl">
          <SelectItem value="all" className="text-sm font-medium">
            Tất cả
          </SelectItem>
          <SelectItem value={DifficultyLevel.BEGINNER} className="text-sm font-medium">
            Cơ bản
          </SelectItem>
          <SelectItem value={DifficultyLevel.INTERMEDIATE} className="text-sm font-medium">
            Trung cấp
          </SelectItem>
          <SelectItem value={DifficultyLevel.ADVANCED} className="text-sm font-medium">
            Nâng cao
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        onClick={() => onSearch(localValue)}
        className="w-full md:w-auto h-11 px-6 rounded-xl font-bold text-sm bg-primary hover:opacity-90 transition-all active:scale-95 cursor-pointer">
        Tìm kiếm
      </Button>
    </div>
  );
};

export default function PublicDecksPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("search") || "";
  const levelQuery = searchParams.get("level") || "all";
  const pageQuery = Number(searchParams.get("page")) || 1;

  // 1. Lấy đủ các biến từ hook
  const { data, isLoading, isError, refetch, isFetching } = usePublicDecks({
    search: searchQuery,
    level: levelQuery === "all" ? undefined : levelQuery,
    page: pageQuery,
  });

  const updateFilters = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") newParams.set(key, String(value));
        else newParams.delete(key);
      });
      if (updates.search !== undefined || updates.level !== undefined) newParams.delete("page");
      router.push(`?${newParams.toString()}`);
    },
    [router, searchParams],
  );

  // 2. Sử dụng isError và refetch để xử lý lỗi kết nối
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-500">
        <div className="mb-6 rounded-2xl bg-destructive/10 p-4 text-destructive">
          <BookCopy size={40} />
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Kết nối bị gián đoạn</h2>
        <p className="text-muted-foreground text-sm font-medium mb-8 max-w-xs opacity-70">
          Không thể tải dữ liệu từ thư viện. Vui lòng kiểm tra kết nối mạng của bạn.
        </p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="rounded-xl font-bold border-primary/20 hover:bg-primary/5 cursor-pointer">
          Thử lại ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pt-4 pb-20 px-1">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl leading-none">
            Thư viện{" "}
            <span className="bg-linear-to-r from-primary to-blue-500 bg-clip-text text-transparent">Cộng đồng</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-80">
            Khám phá kiến thức từ hàng ngàn bộ thẻ Spackie.
          </p>
        </div>

        <div className="w-full lg:max-w-xl">
          <SearchInput
            defaultValue={searchQuery}
            onSearch={(val) => updateFilters({ search: val })}
            isFetching={isFetching}
            levelQuery={levelQuery}
            updateFilters={updateFilters}
          />
          {(searchQuery || levelQuery !== "all") && (
            <button
              onClick={() => router.push(`/${params?.locale}/${params?.role}/vocabulary/decks`)}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors ml-auto cursor-pointer">
              <X size={12} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </header>

      <Separator className="opacity-10" />

      {/* --- Content Logic --- */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl glass-panel border-none animate-pulse" />
          ))}
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-12">
          <div className={`transition-all duration-300 ${isFetching ? "opacity-40 blur-[1px]" : "opacity-100"}`}>
            <DeckDiscovery decks={data.items as Deck[]} />
          </div>

          {data.meta && data.meta.lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8">
              <Button
                variant="ghost"
                size="icon"
                disabled={pageQuery <= 1}
                onClick={() => updateFilters({ page: pageQuery - 1 })}
                className="h-10 w-10 rounded-full glass hover:bg-primary/10 cursor-pointer">
                <ChevronLeft size={18} />
              </Button>

              <div className="px-5 h-10 flex items-center justify-center glass rounded-full border-primary/5 shadow-sm">
                <span className="text-xs font-black tabular-nums">
                  <span className="text-primary">{data.meta.page}</span>
                  <span className="mx-2 opacity-20">/</span>
                  <span className="text-muted-foreground">{data.meta.lastPage}</span>
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                disabled={pageQuery >= data.meta.lastPage}
                onClick={() => updateFilters({ page: pageQuery + 1 })}
                className="h-10 w-10 rounded-full glass hover:bg-primary/10 cursor-pointer">
                <ChevronRight size={18} />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
            <BookCopy size={64} strokeWidth={1} className="relative text-muted-foreground/20" />
          </div>
          <h3 className="text-2xl font-black tracking-tight mb-2">Không tìm thấy kết quả</h3>
          <p className="text-muted-foreground text-sm font-medium max-w-xs opacity-70">
            Hãy thử thay đổi từ khóa hoặc trình độ để tìm thấy nội dung phù hợp.
          </p>
        </div>
      )}
    </div>
  );
}
