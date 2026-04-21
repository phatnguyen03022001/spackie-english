"use client";

import React from "react";
import { Zap, History, Target, BrainCircuit, ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionMode } from "../../types";

interface ExtraStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: SessionMode) => void;
  deckName?: string;
}

interface StudyModeConfig {
  id: SessionMode;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const STUDY_MODES: StudyModeConfig[] = [
  {
    id: SessionMode.ALL,
    title: "Ôn tập tất cả",
    description: "Học lại toàn bộ thẻ trong bộ này không giới hạn.",
    icon: BrainCircuit,
    color: "text-blue-500",
  },
  {
    id: SessionMode.HARD,
    title: "Tập trung từ khó",
    description: "Chỉ ôn những thẻ bạn thường xuyên đánh giá 1-2 điểm.",
    icon: Target,
    color: "text-destructive",
  },
  {
    id: SessionMode.RECENT,
    title: "Vừa mới học",
    description: "Ôn lại các thẻ bạn đã tương tác trong 24 giờ qua.",
    icon: History,
    color: "text-orange-500",
  },
  {
    id: SessionMode.PREVIEW,
    title: "Xem trước thẻ mới",
    description: "Học trước các thẻ chưa từng xuất hiện.",
    icon: Sparkles,
    color: "text-emerald-500",
  },
];

export const ExtraStudyModal: React.FC<ExtraStudyModalProps> = ({ isOpen, onClose, onSelectMode, deckName }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border rounded-2xl shadow-lg glass">
        {/* Header Section */}
        <div className="relative p-6 pb-2">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-primary">
            <Zap size={96} strokeWidth={1} />
          </div>

          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Zap size={12} className="fill-current" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary/70">Bonus Session</span>
            </div>

            <DialogTitle className="text-2xl font-bold tracking-tight leading-tight">
              Tiếp tục <span className="text-primary underline decoration-primary/20 underline-offset-4">bứt phá</span>?
            </DialogTitle>

            <DialogDescription className="text-muted-foreground text-sm pt-2">
              Bạn đã hoàn thành mục tiêu cho{" "}
              <span className="text-foreground font-semibold italic">&quot;{deckName ?? "bộ thẻ"}&quot;</span>. Chọn một
              chế độ để rèn luyện thêm.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Study Modes */}
        <div className="p-4 pt-2 space-y-2">
          {STUDY_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className={cn(
                  "group w-full flex items-center gap-4 p-3 rounded-xl border border-border bg-background",
                  "transition-all duration-200 text-left hover:bg-accent hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring",
                )}>
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    "bg-muted border border-border",
                  )}>
                  <Icon className={cn("h-5 w-5", mode.color)} strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {mode.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                </div>

                <div className="h-7 w-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-primary/10 transition-all">
                  <ArrowRight size={16} className="text-primary" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/20 border-t">
          <Button
            variant="ghost"
            className="w-full font-medium text-muted-foreground hover:text-foreground rounded-lg h-10"
            onClick={onClose}>
            Để sau, tôi muốn nghỉ ngơi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
