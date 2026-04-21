"use client";

import React, { useState } from "react";
import { Plus, Trash2, MoreHorizontal, Import, Move } from "lucide-react";
import { useDeckDetails, useDeleteCard, useMyDecks, useMoveCard } from "../../api/use-management";
import { BulkImportForm } from "./bulk-import-form";
import { Card } from "../../schemas";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardForm } from "./card-form";

interface CardManagerProps {
  deckId: string;
}

export const CardManager = ({ deckId }: CardManagerProps) => {
  // --- API Hooks ---
  const { data: deck, isLoading, error } = useDeckDetails(deckId);
  const { data: myDecks } = useMyDecks();
  const deleteCard = useDeleteCard();
  const moveCardMutation = useMoveCard();

  // --- States ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [moveCard, setMoveCard] = useState<Card | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");

  // --- Handlers ---
  const handleAdd = () => setIsFormOpen(true);
  const handleBulkImport = () => setIsBulkImportOpen(true);

  const handleDeleteClick = (card: Card) => setCardToDelete(card);

  const confirmDelete = () => {
    if (cardToDelete) {
      deleteCard.mutate({ cardId: cardToDelete.id, deckId });
      setCardToDelete(null);
    }
  };

  const handleMoveClick = (card: Card) => {
    setMoveCard(card);
    setSelectedDeckId(deckId); // Mặc định chọn deck hiện tại
  };

  // src/modules/vocab/components/card-manager.tsx

  const handleMoveConfirm = async () => {
    if (!moveCard || !selectedDeckId || selectedDeckId === deckId) {
      setMoveCard(null);
      return;
    }

    try {
      await moveCardMutation.mutateAsync({
        cardId: moveCard.id,
        fromDeckId: deckId,
        toDeckId: selectedDeckId,
      });

      setMoveCard(null);
      setSelectedDeckId("");
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error("Failed to move card:", error);
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertDescription>Không thể tải danh sách thẻ. Vui lòng thử lại sau.</AlertDescription>
      </Alert>
    );
  }

  const cards = (deck?.cards as unknown as Card[]) ?? [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Danh sách thẻ ({cards.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={handleBulkImport}>
            <Import className="mr-2 h-4 w-4" /> Nhập file
          </Button>
          <Button size="sm" onClick={handleAdd} className="rounded-xl font-bold">
            <Plus className="mr-2 h-4 w-4" /> Thêm thẻ
          </Button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-[2rem] bg-muted/10">
          <p className="text-muted-foreground font-medium">Chưa có thẻ nào trong bộ này.</p>
          <Button variant="link" onClick={handleAdd} className="mt-2 font-bold text-primary">
            Thêm thẻ đầu tiên ngay
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Từ vựng</TableHead>
                <TableHead className="font-bold">Phiên âm</TableHead>
                <TableHead className="font-bold">Nghĩa chính</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card) => (
                <TableRow key={card.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell className="font-bold text-base">{card.word?.word ?? "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {card.word?.phonetic ? `/${card.word.phonetic}/` : ""}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <span className="line-clamp-1 text-sm font-medium">
                      {card.word?.meanings?.[0]?.definitions?.[0]?.definition ?? "---"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl font-bold">
                        <DropdownMenuItem onClick={() => handleMoveClick(card)}>
                          <Move className="mr-2 h-4 w-4" /> Di chuyển
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => handleDeleteClick(card)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal thêm thẻ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Thêm thẻ mới</DialogTitle>
          </DialogHeader>
          <CardForm deckId={deckId} onSuccess={() => setIsFormOpen(false)} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal di chuyển thẻ */}
      <AlertDialog open={!!moveCard} onOpenChange={(open) => !open && setMoveCard(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">Di chuyển thẻ</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">
              Chọn bộ thẻ đích cho từ &quot;{moveCard?.word?.word}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-6">
            <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
              <SelectTrigger className="rounded-xl h-12 font-bold border-2 focus:ring-primary">
                <SelectValue placeholder="Chọn bộ thẻ" />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold">
                {myDecks?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title} {d.id === deckId ? "(Hiện tại)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted hover:bg-muted/80">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoveConfirm}
              disabled={!selectedDeckId || selectedDeckId === deckId}
              className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
              Xác nhận di chuyển
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal bulk import */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Import className="h-6 w-6 text-violet-500" />
              Nhập từ vựng hàng loạt
            </DialogTitle>
          </DialogHeader>
          <BulkImportForm
            deckId={deckId}
            onSuccess={() => {
              setIsBulkImportOpen(false);
              // Refresh deck data after successful import
              // The query will automatically refetch due to invalidation in the mutation
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">Xóa thẻ vĩnh viễn?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">
              Bạn có chắc chắn muốn xóa thẻ &quot;{cardToDelete?.word?.word ?? ""}&quot;? Hành động này sẽ loại bỏ từ
              này khỏi bộ thẻ hiện tại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-3">
            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted hover:bg-muted/80">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20">
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
