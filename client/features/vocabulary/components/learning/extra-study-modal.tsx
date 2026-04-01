"use client";

import React from "react";
import { Zap, History, Target, BrainCircuit, ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StudyMode } from "../../types";

interface ExtraStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: StudyMode) => void;
  deckName?: string;
}

interface StudyModeConfig {
  id: StudyMode;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const STUDY_MODES: StudyModeConfig[] = [
  {
    id: StudyMode.ALL,
    title: "Ôn tập tất cả",
    description: "Học lại toàn bộ thẻ trong bộ này không giới hạn.",
    icon: BrainCircuit,
    color: "text-blue-500",
  },
  {
    id: StudyMode.HARD,
    title: "Tập trung từ khó",
    description: "Chỉ ôn những thẻ bạn thường xuyên đánh giá 1-2 điểm.",
    icon: Target,
    color: "text-destructive",
  },
  {
    id: StudyMode.RECENT,
    title: "Vừa mới học",
    description: "Ôn lại các thẻ bạn đã tương tác trong 24 giờ qua.",
    icon: History,
    color: "text-orange-500",
  },
  {
    id: StudyMode.PREVIEW,
    title: "Xem trước thẻ mới",
    description: "Học trước các thẻ chưa từng xuất hiện.",
    icon: Sparkles,
    color: "text-emerald-500",
  },
];

export const ExtraStudyModal: React.FC<ExtraStudyModalProps> = ({ isOpen, onClose, onSelectMode, deckName }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2.5rem] glass shadow-2xl">
        {/* Header Section: Chuyển sang phong cách tinh giản */}
        <div className="relative p-8 pb-4">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-primary">
            <Zap size={120} strokeWidth={1} />
          </div>

          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Zap size={14} className="fill-current" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Bonus Session</span>
            </div>

            <DialogTitle className="text-3xl font-black tracking-tighter leading-tight">
              Tiếp tục{" "}
              <span className="text-primary underline decoration-primary/20 decoration-4 underline-offset-4">
                bứt phá
              </span>
              ?
            </DialogTitle>

            <DialogDescription className="text-muted-foreground font-medium text-sm pt-2">
              Bạn đã hoàn thành mục tiêu cho{" "}
              <span className="text-foreground font-bold italic">&quot;{deckName ?? "bộ thẻ"}&quot;</span>. Chọn một chế
              độ để rèn luyện thêm.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Chế độ học: Card-in-card style */}
        <div className="p-6 pt-2 space-y-3">
          {STUDY_MODES.map((mode) => {
            const Icon = mode.icon;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-background/40 hover:bg-background/80 hover:border-primary/30 transition-all duration-300 text-left hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]">
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    "bg-background shadow-inner border border-border/50",
                  )}>
                  <Icon className={cn("w-6 h-6", mode.color)} strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {mode.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mt-0.5">
                    {mode.description}
                  </p>
                </div>

                <div className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-primary/10 transition-all">
                  <ArrowRight size={18} className="text-primary" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer: Tinh tế hơn */}
        <div className="p-6 bg-muted/20 border-t border-border/20">
          <Button
            variant="ghost"
            className="w-full font-bold text-muted-foreground hover:text-foreground rounded-xl h-12 transition-colors"
            onClick={onClose}>
            Để sau, tôi muốn nghỉ ngơi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
