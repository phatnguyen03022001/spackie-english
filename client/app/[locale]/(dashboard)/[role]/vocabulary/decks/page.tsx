"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, BookCopy, Filter, X, Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useSearchParams, useRouter, useParams } from "next/navigation";

import { usePublicDecks } from "@/features/vocabulary/api";
import { Deck, DeckDiscovery, DifficultyLevel } from "@/features/vocabulary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// --- 1. SearchInput (Tuân thủ mục 5 & 6.1) ---
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
    <div className="group relative flex flex-col md:flex-row items-center gap-2 p-2 glass-panel rounded-[1.5rem] border-primary/10 shadow-2xl shadow-primary/5 focus-within:border-primary/30 transition-all duration-500">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Tìm kiếm bộ thẻ cộng đồng..."
          className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 text-sm font-bold placeholder:text-muted-foreground/40 shadow-none"
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

      <div className="hidden md:block w-px h-8 bg-border/50 mx-1" />

      <Select value={levelQuery} onValueChange={(val) => updateFilters({ level: val })}>
        <SelectTrigger className="w-full md:w-44 h-12 bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-widest hover:bg-primary/5 rounded-xl transition-all shadow-none px-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <SelectValue placeholder="Trình độ" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-2xl glass border-primary/10 shadow-2xl">
          <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider">
            Tất cả
          </SelectItem>
          <SelectItem value={DifficultyLevel.BEGINNER} className="text-xs font-bold uppercase tracking-wider">
            Cơ bản
          </SelectItem>
          <SelectItem value={DifficultyLevel.INTERMEDIATE} className="text-xs font-bold uppercase tracking-wider">
            Trung cấp
          </SelectItem>
          <SelectItem value={DifficultyLevel.ADVANCED} className="text-xs font-bold uppercase tracking-wider">
            Nâng cao
          </SelectItem>
          <SelectItem value={DifficultyLevel.COMMUNICATION} className="text-xs font-bold uppercase tracking-wider">
            Giao tiếp
          </SelectItem>
          <SelectItem value={DifficultyLevel.EXAM_PREP} className="text-xs font-bold uppercase tracking-wider">
            Luyện đề
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        onClick={() => onSearch(localValue)}
        className="w-full md:w-auto h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 cursor-pointer">
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

  // --- 2. Error State (Mục 1 & 10) ---
  if (isError) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-500">
        <div className="mb-8 rounded-3xl bg-destructive/5 p-6 text-destructive glass border border-destructive/10">
          <BookCopy size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-3">Kết nối gián đoạn</h2>
        <p className="text-muted-foreground font-medium mb-10 max-w-sm opacity-70 leading-relaxed">
          Không thể đồng bộ với thư viện cộng đồng. Vui lòng kiểm tra lại đường truyền của bạn.
        </p>
        <Button
          onClick={() => refetch()}
          size="lg"
          className="rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-primary shadow-xl shadow-primary/20">
          Thử lại ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-10 py-6 pb-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- Header & Search (Mục 6.1) --- */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
            <Sparkles size={12} fill="currentColor" />
            <span>Community Discovery</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter md:text-5xl leading-none">
            Thư viện <span className="text-primary">Cộng đồng</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg opacity-70">
            Tiếp cận kho tri thức từ hàng ngàn chuyên gia và người học.
          </p>
        </div>

        <div className="w-full xl:max-w-2xl">
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
              className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive transition-all ml-auto pr-2">
              <X size={14} strokeWidth={3} /> Xóa bộ lọc hiện tại
            </button>
          )}
        </div>
      </header>

      <Separator className="bg-primary/5 h-px" />

      {/* --- Content Area --- */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-[2rem] bg-muted/20" />
          ))}
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-16">
          <div
            className={`transition-all duration-500 ${isFetching ? "opacity-30 blur-sm scale-[0.99]" : "opacity-100 scale-100"}`}>
            <DeckDiscovery decks={data.items as Deck[]} />
          </div>

          {/* --- Pagination (Tuân thủ mục 5 & 2.3) --- */}
          {data.meta && data.meta.lastPage > 1 && (
            <div className="flex items-center justify-center gap-4 pt-10">
              <Button
                variant="ghost"
                size="icon"
                disabled={pageQuery <= 1}
                onClick={() => updateFilters({ page: pageQuery - 1 })}
                className="h-12 w-12 rounded-2xl glass hover:bg-primary/10 border-primary/5 shadow-sm disabled:opacity-20">
                <ChevronLeft size={20} strokeWidth={2.5} />
              </Button>

              <div className="px-8 h-12 flex items-center justify-center glass rounded-2xl border-primary/10 shadow-inner">
                <span className="text-[11px] font-black tabular-nums tracking-widest uppercase">
                  Trang <span className="text-primary mx-1">{data.meta.page}</span>
                  <span className="opacity-20 mx-2">/</span>
                  <span className="text-muted-foreground">{data.meta.lastPage}</span>
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                disabled={pageQuery >= data.meta.lastPage}
                onClick={() => updateFilters({ page: pageQuery + 1 })}
                className="h-12 w-12 rounded-2xl glass hover:bg-primary/10 border-primary/5 shadow-sm disabled:opacity-20">
                <ChevronRight size={20} strokeWidth={2.5} />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-150" />
            <div className="relative h-24 w-24 glass rounded-3xl flex items-center justify-center border-primary/10 shadow-2xl">
              <BookCopy size={48} strokeWidth={1} className="text-muted-foreground/30" />
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-3">Tìm kiếm vô vọng?</h3>
          <p className="text-muted-foreground font-medium max-w-sm opacity-70 leading-relaxed text-sm">
            Hệ thống không tìm thấy kết quả khớp với yêu cầu của bạn. Hãy thử từ khóa ngắn gọn hơn hoặc chọn tất cả
            trình độ.
          </p>
        </div>
      )}
    </div>
  );
}
