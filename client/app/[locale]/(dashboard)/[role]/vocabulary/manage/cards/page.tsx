"use client";
import { CardForm } from "@/features/vocabulary/components/management/card-form";
import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { toast } from "sonner";

export default function AddCardPage() {
  return (
    <div className="max-w-4xl">
      <h3 className="text-lg font-medium mb-4">Thêm thẻ mới</h3>
      <CardForm
        onSubmit={async (data) => {
          // Giả sử bạn truyền deckId qua URL hoặc State
          await vocabApi.addCard("some-deck-id", data);
          toast.success("Đã thêm thẻ mới");
        }}
      />
    </div>
  );
}
