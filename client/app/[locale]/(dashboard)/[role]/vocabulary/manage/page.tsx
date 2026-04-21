"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  MoreHorizontal,
  Search,
  BookOpen,
  Loader2,
  Settings2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

import { useMyDecks, useDeleteDeck } from "@/features/vocabulary/api/use-management";
import { DeckForm } from "@/features/vocabulary/components/management/deck-form";
import { TogglePublicButton } from "@/features/vocabulary/components/shared";
import { DifficultyLevel } from "@/features/vocabulary/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function VocabularyManagePage() {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string;
  const role = params?.role as string;
  const baseUrl = `/${locale}/${role}/vocabulary/manage`;

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: decks, isLoading } = useMyDecks();
  const { mutate: deleteDeck, isPending: isDeleting } = useDeleteDeck();

  const filteredDecks = decks?.filter((deck) => deck.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const getLevelBadge = (level: DifficultyLevel) => {
    const configs: Record<DifficultyLevel, { label: string; class: string }> = {
      [DifficultyLevel.BEGINNER]: { label: "Cơ bản", class: "bg-primary/10 text-primary" },
      [DifficultyLevel.INTERMEDIATE]: { label: "Trung cấp", class: "bg-accent/10 text-accent-foreground" },
      [DifficultyLevel.ADVANCED]: { label: "Nâng cao", class: "bg-secondary/10 text-secondary-foreground" },
      [DifficultyLevel.EXAM_PREP]: { label: "Luyện thi", class: "bg-destructive/10 text-destructive" },
      [DifficultyLevel.COMMUNICATION]: { label: "Giao tiếp", class: "bg-emerald-500/10 text-emerald-600" },
    };
    const config = configs[level] || { label: level, class: "" };
    return (
      <Badge
        variant="outline"
        className={`rounded-full border-none font-black text-[10px] uppercase tracking-wider ${config.class}`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4 px-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 rounded-2xl bg-muted/20" />
          <Skeleton className="h-12 w-40 rounded-2xl bg-muted/20" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-3xl bg-muted/20 border border-border/10" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4 pb-20 px-1">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] opacity-70">
            <Sparkles size={12} fill="currentColor" />
            <span>Studio Management</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl leading-none">
            Quản lý{" "}
            <span className="bg-linear-to-r from-primary to-blue-500 bg-clip-text text-transparent">nội dung</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-80">
            Xây dựng và tối ưu hóa thư viện từ vựng của bạn.
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer px-6">
              <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Tạo bộ thẻ mới
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] max-w-lg glass border-primary/10 shadow-2xl p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Thiết lập bộ thẻ</DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground pt-1">
                Điền thông tin cơ bản để bắt đầu thêm từ vựng vào hệ thống.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              <DeckForm onSuccess={() => setIsCreateModalOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- Toolbar --- */}
      <div className="flex items-center gap-4 glass-panel p-2 rounded-2xl border-primary/5 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Tìm kiếm bộ thẻ của bạn..."
            className="pl-11 border-none focus-visible:ring-0 shadow-none bg-transparent h-11 text-sm font-bold placeholder:text-muted-foreground/40 placeholder:font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="glass-panel rounded-3xl border-primary/5 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent border-border/5">
              <TableHead className="font-black text-[10px] uppercase tracking-widest py-5 pl-8 text-muted-foreground/60">
                Bộ thẻ
              </TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Trình độ
              </TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Trạng thái
              </TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-center text-muted-foreground/60">
                Quy mô
              </TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredDecks || filteredDecks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30 gap-4">
                    <BookOpen size={48} strokeWidth={1} />
                    <p className="font-black text-sm uppercase tracking-widest">Chưa có dữ liệu</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDecks.map((deck) => (
                <TableRow key={deck.id} className="hover:bg-primary/5 border-border/5 transition-colors group">
                  <TableCell className="pl-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-base tracking-tight leading-none group-hover:text-primary transition-colors">
                        {deck.title}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                        ID: {deck.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getLevelBadge(deck.levelTag)}</TableCell>
                  <TableCell>
                    <TogglePublicButton deckId={deck.id} isPublic={deck.isPublic} size="sm" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-black text-lg tabular-nums leading-none text-primary">
                        {typeof deck._count?.cards === "number" ? deck._count.cards : 0}
                      </span>
                      <span className="text-[8px] font-bold uppercase opacity-30">thẻ từ</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-full hover:bg-secondary transition-colors cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="glass rounded-2xl w-52 p-1.5 shadow-2xl border-primary/10">
                        <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[9px] text-muted-foreground/50 uppercase tracking-[0.2em] font-black">
                          Quản trị viên
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          className="rounded-xl font-bold text-xs py-2.5 cursor-pointer focus:bg-primary/10 focus:text-primary"
                          onClick={() => router.push(`${baseUrl}/${deck.id}`)}>
                          <Settings2 className="mr-2 h-4 w-4" /> Quản lý từ vựng
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl font-bold text-xs py-2.5 cursor-pointer focus:bg-primary/10 focus:text-primary"
                          onClick={() => window.open(`/${locale}/${role}/vocabulary/decks/${deck.id}`, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Xem Preview
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1.5 bg-border/5" />
                        <DropdownMenuItem
                          className="rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10 font-bold text-xs py-2.5 cursor-pointer"
                          onClick={() => setDeleteId(deck.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Xóa bộ thẻ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Delete Alert --- */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2.5rem] glass border-primary/10 p-8 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Xóa vĩnh viễn dữ liệu?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground pt-2">
              Toàn bộ từ vựng và tiến trình SRS của người học sẽ biến mất. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl font-bold bg-secondary/50 border-none cursor-pointer px-6">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteDeck(deleteId, { onSuccess: () => setDeleteId(null) })}
              disabled={isDeleting}
              className="h-12 rounded-xl font-bold bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20 cursor-pointer px-6">
              {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : "Xác nhận xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
