"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Flame, GraduationCap, MoreVertical, Trash2, PlayCircle, Loader2, Library } from "lucide-react";
import { toast } from "sonner";

import { useEnrolledDecks, useUnenrollDeck } from "@/features/vocabulary/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  if (isLoading)
    return (
      <div className="pt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl bg-muted/20 border border-border/10" />
        ))}
      </div>
    );

  if (isError || !decks || decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full" />
          <Library size={80} strokeWidth={0.5} className="relative text-muted-foreground/20" />
        </div>
        <h2 className="text-4xl font-black tracking-tighter mb-3">Thư viện trống</h2>
        <p className="text-muted-foreground font-medium max-w-xs mb-10 opacity-80 text-lg">
          Bắt đầu hành trình bằng cách khám phá những bộ thẻ từ vựng cộng đồng.
        </p>
        <Button
          asChild
          className="h-12 px-8 rounded-xl font-black text-sm uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 cursor-pointer">
          <Link href={`${baseUrl}/decks`}>Khám phá ngay</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4 pb-20 px-1">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl leading-none">
            Bộ thẻ{" "}
            <span className="bg-linear-to-r from-primary to-blue-500 bg-clip-text text-transparent">của tôi</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-80">
            Tiếp tục hành trình chinh phục {decks.length} chủ đề từ vựng.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => {
          const total = deck.cardCount || deck._count?.cards || 0;
          const mastered = deck.masteredCount || 0;
          const due = deck.dueCount || 0;
          const masteryPercentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
          const hasDueCards = due > 0;

          return (
            <div
              key={deck.id}
              className="group relative flex flex-col glass-panel p-5! rounded-3xl! border-primary/10 shadow-xl shadow-primary/5 hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <MoreVertical size={14} className="text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass rounded-xl border-primary/10 p-1">
                    <DropdownMenuItem
                      className="text-destructive font-bold text-xs cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => setDeleteId(deck.id)}>
                      <Trash2 size={14} className="mr-2" /> Hủy đăng ký
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-lg font-black tracking-tight mb-1 transition-colors group-hover:text-primary leading-tight">
                    {deck.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/10 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 py-0 px-2 bg-secondary/10">
                    {total} Vocabs
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-primary">
                      <GraduationCap size={14} /> {masteryPercentage}% Mastered
                    </span>
                    <span className="text-muted-foreground/50">
                      {mastered}/{total}
                    </span>
                  </div>
                  <Progress value={masteryPercentage} className="h-1.5 bg-secondary/40 border-none" />
                </div>

                <div className="grid grid-cols-2 pt-4 border-t border-border/10">
                  <div className="space-y-0.5">
                    <p
                      className={`text-2xl font-black tabular-nums leading-none ${hasDueCards ? "text-orange-500" : "text-muted-foreground/20"}`}>
                      {due}
                    </p>
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                      Cần ôn tập
                    </p>
                  </div>
                  <div className="space-y-0.5 border-l border-border/10 pl-5">
                    <p className="text-2xl font-black text-primary tabular-nums leading-none">{mastered}</p>
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Đã thuộc</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setSelectedDeck({ id: deck.id, name: deck.title })}
                className={`
                  mt-6 h-11 w-full rounded-xl font-black text-[11px] uppercase tracking-[0.15em] 
                  transition-all duration-300 active:scale-[0.97] cursor-pointer
                  ${
                    hasDueCards
                      ? "bg-primary text-white shadow-[0_8px_20px_-6px_rgba(var(--primary),0.4)] hover:shadow-[0_12px_25px_-5px_rgba(var(--primary),0.5)] hover:-translate-y-0.5"
                      : "glass border-primary/10 text-foreground/80 hover:bg-primary/5 hover:text-primary shadow-none"
                  }
                `}>
                {hasDueCards ? (
                  <div className="flex items-center justify-center gap-2">
                    <Flame size={14} className="fill-orange-400 text-orange-400 animate-pulse" />
                    <span>Ôn tập ngay</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <PlayCircle size={14} className="transition-transform group-hover:scale-110" />
                    <span className="text-whtie">Tiếp tục học</span>
                  </div>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <ExtraStudyModal
        isOpen={!!selectedDeck}
        onClose={() => setSelectedDeck(null)}
        onSelectMode={(m) => router.push(`${baseUrl}/review?deckId=${selectedDeck?.id}&mode=${m}`)}
        deckName={selectedDeck?.name}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-4xl glass border-primary/10 p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Hủy đăng ký bộ thẻ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground">
              Tiến trình ghi nhớ (SRS) của bạn cho bộ thẻ này sẽ bị xóa vĩnh viễn. Bạn chắc chắn chứ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-11 rounded-xl font-bold bg-secondary/50 border-none cursor-pointer">
              Để sau
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnenroll}
              disabled={isUnenrolling}
              className="h-11 rounded-xl font-bold bg-destructive text-white hover:bg-destructive/90 cursor-pointer shadow-lg shadow-destructive/20">
              {isUnenrolling ? <Loader2 className="animate-spin" /> : "Xác nhận xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
