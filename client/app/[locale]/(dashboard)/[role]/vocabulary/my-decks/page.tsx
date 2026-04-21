"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Flame, GraduationCap, MoreVertical, Trash2, PlayCircle, Loader2, Library, Sparkles } from "lucide-react";
import { toast } from "sonner"; // Sử dụng Sonner theo mục 4.1

import { useEnrolledDecks, useUnenrollDeck } from "@/features/vocabulary/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"; // Sử dụng đúng cấu trúc Card mục 4.1
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExtraStudyModal } from "@/features/vocabulary/components/learning/extra-study-modal";

export default function MyDecksPage() {
  const router = useRouter();
  const params = useParams();
  const baseUrl = `/${params?.locale}/${params?.role}/vocabulary`;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<{ id: string; name: string } | null>(null);

  const { data: decks, isLoading, isError, refetch } = useEnrolledDecks();
  const { mutate: unenroll, isPending: isUnenrolling } = useUnenrollDeck();

  const handleUnenroll = () => {
    if (!deleteId) return;
    unenroll(deleteId, {
      onSuccess: () => {
        toast.success("Đã xóa bộ thẻ thành công");
        setDeleteId(null);
        refetch();
      },
    });
  };

  // --- 1. Loading State (Tuân thủ mục 4.1 & 10) ---
  if (isLoading)
    return (
      <div className="container mx-auto pt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl bg-muted/20" />
        ))}
      </div>
    );

  // --- 2. Empty State (Tuân thủ mục 1 & 6.2) ---
  if (isError || !decks || decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full" />
          <Library size={80} strokeWidth={0.5} className="relative text-muted-foreground/20" />
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-3">Thư viện trống</h2>
        <p className="text-muted-foreground max-w-xs mb-10 opacity-80">
          Bắt đầu hành trình bằng cách khám phá những bộ thẻ từ vựng cộng đồng.
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-xl font-bold uppercase tracking-widest bg-primary shadow-xl shadow-primary/20">
          <Link href={`${baseUrl}/decks`}>Khám phá ngay</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-10 py-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- Header Section (Tuân thủ mục 6.1) --- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] opacity-70">
            <Sparkles size={12} fill="currentColor" />
            <span>Learning Journey</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl leading-none">
            Bộ thẻ <span className="text-primary">của tôi</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-80">
            Bạn đang tham gia {decks.length} lộ trình học tập tích cực.
          </p>
        </div>
      </header>

      {/* --- Grid Layout (Tuân thủ mục 6.3) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {decks.map((deck) => {
          const total = deck.cardCount || deck._count?.cards || 0;
          const mastered = deck.masteredCount || 0;
          const due = deck.dueCount || 0;
          const masteryPercentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
          const hasDueCards = due > 0;

          return (
            <Card
              key={deck.id}
              className="group glass-panel relative flex flex-col border-primary/10 shadow-xl hover:border-primary/30 transition-all duration-300 rounded-[2rem] overflow-hidden">
              {/* Dropdown Menu (Tuân thủ mục 4.1) */}
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={14} className="text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass rounded-xl border-primary/10">
                    <DropdownMenuItem
                      className="text-destructive font-bold focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => setDeleteId(deck.id)}>
                      <Trash2 size={14} className="mr-2" /> Hủy đăng ký
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="p-6 pb-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors leading-tight">
                    {deck.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[9px] font-black uppercase tracking-widest px-2 bg-secondary/30">
                    {total} Vocabs
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-6">
                {/* Progress Section (Tuân thủ mục 2.1 & 4.1) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-primary">
                      <GraduationCap size={14} /> {masteryPercentage}% Mastered
                    </span>
                    <span className="text-muted-foreground/40">
                      {mastered}/{total}
                    </span>
                  </div>
                  <Progress value={masteryPercentage} className="h-1.5 bg-muted" />
                </div>

                {/* Stats Grid (Tuân thủ mục 6.2) */}
                <div className="grid grid-cols-2 py-4 border-t border-border/50">
                  <div className="space-y-1">
                    <p
                      className={`text-2xl font-black tabular-nums ${hasDueCards ? "text-orange-500" : "text-muted-foreground/20"}`}>
                      {due}
                    </p>
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                      Cần ôn tập
                    </p>
                  </div>
                  <div className="space-y-1 border-l border-border pl-6">
                    <p className="text-2xl font-black text-primary tabular-nums">{mastered}</p>
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Đã thuộc</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  onClick={() => setSelectedDeck({ id: deck.id, name: deck.title })}
                  className={`
                    w-full h-12 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all
                    ${
                      hasDueCards
                        ? "bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
                        : "glass border-primary/10 text-foreground/70 hover:bg-primary/5 hover:text-primary"
                    }
                  `}>
                  {hasDueCards ? (
                    <div className="flex items-center gap-2">
                      <Flame size={14} className="fill-orange-400 text-orange-400 animate-pulse" />
                      <span>Ôn tập ngay</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <PlayCircle size={14} />
                      <span>Tiếp tục học</span>
                    </div>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* --- Modals (Tuân thủ mục 4.1 Dialog) --- */}
      <ExtraStudyModal
        isOpen={!!selectedDeck}
        onClose={() => setSelectedDeck(null)}
        onSelectMode={(m) => router.push(`${baseUrl}/review?deckId=${selectedDeck?.id}&mode=${m}`)}
        deckName={selectedDeck?.name}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl glass border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Hủy đăng ký?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Tiến trình SRS của bạn cho bộ thẻ này sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold bg-muted border-none">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnenroll}
              disabled={isUnenrolling}
              className="rounded-xl font-bold bg-destructive text-white shadow-lg shadow-destructive/20">
              {isUnenrolling ? <Loader2 className="animate-spin" /> : "Xác nhận xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
