"use client";
import { BulkImportForm } from "@/features/vocabulary/components/management/bulk-import-form";
import { vocabApi } from "@/features/vocabulary/api/vocab-client";
import { toast } from "sonner";

export default function ImportPage() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-medium mb-4">Nhập liệu AI (Tự động tạo định nghĩa)</h3>
      <BulkImportForm
        onImport={async (words) => {
          await vocabApi.bulkImportCards("some-deck-id", words);
          toast.success(`Đang xử lý ${words.length} từ vựng...`);
        }}
      />
    </div>
  );
}
