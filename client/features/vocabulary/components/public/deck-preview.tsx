"use client";

import React from "react";
import Image from "next/image";
import {
  ChevronLeft,
  Info,
  PlusCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  BookOpen,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";

import { Deck } from "../../schemas";
import { useEnrollDeck } from "../../api/use-decks";
import { useUnenrollDeck } from "../../api/use-decks";

import { Badge } from "@/components/ui/badge";

interface DeckPreviewProps {
  deck: Deck;
}

export const DeckPreview = ({ deck }: DeckPreviewProps) => {
  const router = useRouter();
  const enrollMutation = useEnrollDeck();
  const unenrollMutation = useUnenrollDeck();
  const params = useParams();

  const locale = (params?.locale as string) || "vi";
  const role = (params?.role as string) || "user";

  const isEnrolled = deck.isEnrolled ?? false;

  const handleEnroll = () => {
    enrollMutation.mutate(deck.id, {
      onSuccess: () => {
        toast.success("Đăng ký thành công", {
          description: `Bộ thẻ "${deck.title}" đã sẵn sàng.`,
          action: {
            label: "Học ngay",
            onClick: () => router.push(`/${locale}/${role}/vocabulary/my-decks/${deck.id}`),
          },
        });
      },
      onError: () => toast.error("Lỗi hệ thống"),
    });
  };

  const handleUnenroll = () => {
    unenrollMutation.mutate(deck.id, {
      onSuccess: () => {
        toast.success("Hủy đăng ký thành công");
        router.refresh();
      },
      onError: () => toast.error("Không thể hủy đăng ký"),
    });
  };

  const safeCards = Array.isArray(deck.cards) ? deck.cards : [];
  const totalCards = safeCards.length || deck._count?.cards || 0;
  const previewCards = safeCards.slice(0, 10);

  return (
    <div className="">
      {/* Header Navigation */}
      <nav className="py-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="group text-muted-foreground hover:text-primary -ml-4 rounded-full transition-colors">
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          Quay lại khám phá
        </Button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
        {/* MAIN CONTENT */}
        <div className="space-y-10 w-full">
          {/* Hero Section */}
          <div className="relative p-8 md:p-12 rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden group">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-10">
              {/* Badge & Meta */}
              <div className="flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
                  {deck.levelTag}
                </Badge>
                {deck.creator && (
                  <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm pl-1 pr-3 py-1 rounded-full border border-border/40 shadow-sm">
                    {deck.creator.avatar ? (
                      <Image
                        src={deck.creator.avatar}
                        alt={deck.creator.name || "Avatar"}
                        fill
                        sizes="24px"
                        className="rounded-full object-cover border border-primary/20"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {deck.creator.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground leading-none">Tạo bởi</span>
                      <span className="text-xs font-bold text-foreground leading-tight">
                        {deck.creator.name || "Thành viên"}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">
                  <CalendarDays size={14} className="mr-2" />
                  {new Date(deck.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-6">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {deck.title}
                </h1>
                <p className="text-xl text-muted-foreground/80 font-medium leading-relaxed italic border-l-2 border-primary/20 pl-6 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
                  {deck.description || "Khám phá vốn từ vựng chuyên sâu thông qua lộ trình học thuật tối giản."}
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-4 bg-background/40 backdrop-blur-md px-6 py-4 rounded-[1.5rem] border border-border/50">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter leading-none mb-1.5">
                      Quy mô hệ thống
                    </p>
                    <p className="text-2xl font-black tracking-tighter leading-none">
                      {totalCards} <span className="text-sm font-medium opacity-40">từ vựng</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Words Section */}
          <div className="space-y-8 animate-in fade-in duration-1000">
            <div className="flex items-center justify-between border-b border-border/40 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-full">
                  <Sparkles className="h-5 w-5 text-yellow-600 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Nội dung xem trước</h3>
              </div>
              <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground rounded-full px-4 font-bold">
                {previewCards.length} / {totalCards} tiêu biểu
              </Badge>
            </div>

            <div className="grid gap-4">
              {previewCards.length > 0 ? (
                previewCards.map((card) => {
                  const wordData = card.word;
                  const primaryMeaning = wordData?.meanings?.[0];
                  return (
                    <div
                      key={card.id}
                      className="group p-5 rounded-[1.8rem] border border-border/30 bg-card/30 backdrop-blur-sm flex justify-between items-center transition-all duration-300 hover:border-primary/40 hover:bg-card hover:translate-x-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg group-hover:text-primary transition-colors">
                            {wordData?.word || "N/A"}
                          </span>
                          {wordData?.phonetic && (
                            <span className="text-xs text-muted-foreground/30 font-mono">/{wordData.phonetic}/</span>
                          )}
                          {primaryMeaning?.partOfSpeech && (
                            <span className="text-[9px] bg-secondary/80 text-muted-foreground/70 px-2 py-0.5 rounded-full font-black uppercase">
                              {primaryMeaning.partOfSpeech}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium line-clamp-1 group-hover:text-foreground/80">
                          {primaryMeaning?.definitions?.[0]?.definition || "Đăng ký để xem chi tiết"}
                        </p>
                      </div>
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/5 text-primary/10 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5 flex flex-col items-center gap-4">
                  <BookOpen className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-muted-foreground font-medium italic">
                    Nội dung đang được biên soạn bởi đội ngũ chuyên gia.
                  </p>
                </div>
              )}

              {totalCards > 10 && (
                <div className="py-12 border-2 border-dashed border-border/20 rounded-[2.5rem] flex flex-col items-center justify-center group hover:bg-muted/5 transition-colors">
                  <p className="text-muted-foreground font-bold">
                    Còn <span className="text-primary text-xl">+{totalCards - 10}</span> từ vựng chuyên sâu khác
                  </p>
                  {!isEnrolled && (
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1 opacity-50 group-hover:opacity-100">
                      Đăng ký để mở khóa toàn bộ
                    </p>
                  )}
                  {isEnrolled && (
                    <p className="text-[10px] text-emerald-600/70 uppercase tracking-widest font-bold mt-1">
                      Đã có trong lộ trình học của bạn
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTION SIDEBAR */}
        <aside className="lg:sticky lg:top-10">
          <div className="p-8 rounded-[2.5rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-8">
              <div className="space-y-2">
                <h3 className="font-bold text-xl flex items-center gap-3 tracking-tight">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Info size={18} className="text-primary" />
                  </div>
                  Ghi danh học tập
                </h3>
              </div>

              <div className="p-6 rounded-[1.5rem] bg-secondary/20 border border-border/20 space-y-5">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground/60 tracking-tight">Trạng thái sở hữu:</span>
                  {isEnrolled ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-none font-bold px-3 py-1 rounded-full">
                      Đã sở hữu
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-orange-500/30 text-orange-500 bg-orange-500/5 font-bold px-3 py-1 rounded-full">
                      Chưa đăng ký
                    </Badge>
                  )}
                </div>
                <Separator className="bg-border/30" />
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground/60 tracking-tight">Lộ trình học:</span>
                  <span className="font-bold tracking-tight">SRS v2.0 AI</span>
                </div>
              </div>

              {isEnrolled ? (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl font-bold border-destructive text-destructive hover:bg-destructive hover:text-white transition-all"
                    onClick={handleUnenroll}
                    disabled={unenrollMutation.isPending}>
                    {unenrollMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    HỦY ĐĂNG KÝ
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground/50 font-black tracking-widest uppercase">
                    Bạn sẽ mất quyền truy cập bộ thẻ này
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <Button
                    className="w-full h-12 rounded-2xl font-bold bg-foreground text-background hover:bg-primary hover:text-primary-foreground transition-all duration-300 group/btn shadow-lg shadow-foreground/5 hover:shadow-primary/20"
                    size="lg"
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending || totalCards === 0}>
                    {enrollMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        GHI DANH MIỄN PHÍ
                        <PlusCircle size={18} className="ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed px-4 font-medium italic">
                    Tham gia cùng cộng đồng học viên và ghi nhớ từ vựng vĩnh viễn với thuật toán SRS.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
