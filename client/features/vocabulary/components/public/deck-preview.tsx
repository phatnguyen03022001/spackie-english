"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, Sparkles, BookOpen, CalendarDays, Trash2, Zap, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { Deck } from "../../schemas";
import { useEnrollDeck, useUnenrollDeck } from "../../api/use-decks";
import { Badge } from "@/components/ui/badge";

interface DeckPreviewProps {
  deck: Deck;
}

export const DeckPreview = ({ deck }: DeckPreviewProps) => {
  const router = useRouter();
  const enrollMutation = useEnrollDeck();
  const unenrollMutation = useUnenrollDeck();

  const isEnrolled = deck.isEnrolled ?? false;

  const handleEnroll = () => enrollMutation.mutate(deck.id);
  const handleUnenroll = () => unenrollMutation.mutate(deck.id, { onSuccess: () => router.refresh() });

  const safeCards = Array.isArray(deck.cards) ? deck.cards : [];
  const totalCards = safeCards.length || deck._count?.cards || 0;
  const previewCards = safeCards.slice(0, 10);

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
        {/* --- MAIN CONTENT --- */}
        <div className="space-y-12">
          {/* Hero Glass Card */}
          <section className="relative p-8 md:p-14 rounded-[3rem] border border-primary/10 bg-card/30 backdrop-blur-2xl overflow-hidden group shadow-2xl shadow-primary/5">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-primary/15 transition-colors duration-1000" />

            <div className="relative z-10 space-y-8">
              {/* Meta Badge Row */}
              <div className="flex flex-wrap items-center gap-4">
                <Badge className="bg-primary text-primary-foreground border-none rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                  {deck.levelTag || "General"}
                </Badge>

                {deck.creator && (
                  <div className="flex items-center gap-2.5 bg-background/40 backdrop-blur-md pl-1.5 pr-4 py-1.5 rounded-2xl border border-primary/5 shadow-sm">
                    <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                      {deck.creator.avatar ? (
                        <Image src={deck.creator.avatar} alt="Avatar" fill className="object-cover" />
                      ) : (
                        deck.creator.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-[11px] font-black tracking-tight opacity-80">{deck.creator.name}</span>
                  </div>
                )}

                <div className="flex items-center text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-auto">
                  <CalendarDays size={14} className="mr-2" />
                  {new Date(deck.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-6">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] animate-in slide-in-from-left-4 duration-700">
                  {deck.title}
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-3xl opacity-80">
                  {deck.description || "Khám phá vốn từ vựng chuyên sâu thông qua lộ trình học thuật tối giản."}
                </p>
              </div>

              {/* Quick Stats Grid */}
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-4 bg-primary/[0.03] border border-primary/10 px-8 py-5 rounded-[2rem] min-w-[200px]">
                  <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                    <BookOpen size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">Quy mô</p>
                    <p className="text-3xl font-black tracking-tighter leading-none">{totalCards}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Preview Content List */}
          <div className="space-y-8 px-2">
            <div className="flex items-center justify-between border-b border-primary/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600">
                  <Sparkles size={20} fill="currentColor" className="animate-pulse" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Từ vựng tiêu biểu</h3>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-primary/10 font-black text-[10px] px-4 py-1 opacity-60">
                PREVIEW {previewCards.length}/{totalCards}
              </Badge>
            </div>

            <div className="grid gap-3">
              {previewCards.length > 0 ? (
                previewCards.map((card) => (
                  <div
                    key={card.id}
                    className="group p-6 rounded-[2rem] border border-primary/5 bg-card/40 backdrop-blur-sm flex justify-between items-center transition-all duration-500 hover:border-primary/30 hover:bg-background hover:translate-x-2 hover:shadow-xl hover:shadow-primary/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xl tracking-tight group-hover:text-primary transition-colors">
                          {card.word?.word}
                        </span>
                        <span className="text-[10px] font-black text-muted-foreground/30 tracking-widest uppercase bg-muted/50 px-2 py-0.5 rounded-md">
                          {card.word?.meanings?.[0]?.partOfSpeech}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                        {card.word?.meanings?.[0]?.definitions?.[0]?.definition}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/10 group-hover:text-primary group-hover:bg-primary/10 group-hover:rotate-12 transition-all duration-500">
                      <CheckCircle2 size={24} strokeWidth={2.5} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-primary/10 rounded-[3rem] bg-primary/[0.01] flex flex-col items-center gap-4">
                  {!isEnrolled ? (
                    <>
                      <Lock size={48} className="text-primary/20" strokeWidth={1.5} />
                      <p className="font-black text-xs uppercase tracking-widest">Đăng ký để xem danh sách từ vựng</p>
                      <Button onClick={handleEnroll} className="mt-2">
                        Ghi danh ngay
                      </Button>
                    </>
                  ) : (
                    <>
                      <BookOpen size={48} strokeWidth={1} className="text-primary/20" />
                      <p className="font-black text-xs uppercase tracking-widest">Dữ liệu đang được cập nhật</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- ACTION SIDEBAR --- */}
        <aside className="lg:sticky lg:top-8 space-y-6">
          <div className="p-10 rounded-[3rem] border border-primary/10 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-primary/5 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

            <div className="relative space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <Zap size={24} fill="currentColor" />
                </div>
                <h3 className="font-black text-xl tracking-tight uppercase tracking-[0.05em]">Lộ trình SRS</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/[0.03] border border-primary/5 text-xs font-black uppercase tracking-widest">
                  <span className="opacity-40">Trạng thái</span>
                  {isEnrolled ? (
                    <span className="text-emerald-500 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Đã sở hữu
                    </span>
                  ) : (
                    <span className="text-orange-500">Chưa ghi danh</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/[0.03] border border-primary/5 text-xs font-black uppercase tracking-widest">
                  <span className="opacity-40">Thuật toán</span>
                  <span className="text-primary">Spackie AI 2.0</span>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                {isEnrolled ? (
                  <Button
                    variant="outline"
                    className="w-full h-16 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/5"
                    onClick={handleUnenroll}
                    disabled={unenrollMutation.isPending}>
                    {unenrollMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4 stroke-[3]" /> Hủy đăng ký
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full h-16 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending}>
                    {enrollMutation.isPending ? <Loader2 className="animate-spin" /> : "Ghi danh miễn phí"}
                  </Button>
                )}
                <p className="text-[10px] text-center text-muted-foreground font-bold leading-relaxed px-4 opacity-50 uppercase tracking-widest">
                  Ghi nhớ vĩnh viễn với khoa học SRS
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
