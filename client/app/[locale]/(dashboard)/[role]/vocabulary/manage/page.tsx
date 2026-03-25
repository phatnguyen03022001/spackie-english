"use client";
import { DeckForm } from "@/features/vocabulary/components/management/deck-form";
import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { toast } from "sonner";

export default function ManageDecksPage() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-medium mb-4">Tạo bộ thẻ mới</h3>
      <DeckForm
        onSubmit={async (data) => {
          await vocabApi.createDeck(data);
          toast.success("Đã tạo Deck thành công");
        }}
      />
    </div>
  );
}
