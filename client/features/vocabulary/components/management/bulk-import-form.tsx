"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileUp } from "lucide-react";
import { toast } from "sonner";

interface BulkImportFormProps {
  onImport: (words: string[]) => Promise<void>;
}

export function BulkImportForm({ onImport }: BulkImportFormProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = async () => {
    // Tách dòng, loại bỏ khoảng trắng và dòng trống
    const words = text
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      toast.error("Vui lòng nhập ít nhất một từ vựng");
      return;
    }

    setIsLoading(true);
    try {
      await onImport(words);
      setText("");
      toast.success(`Đã xử lý yêu cầu nhập ${words.length} từ`);
    } catch {
      toast.error("Có lỗi xảy ra khi nhập dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Nhập danh sách từ vựng</h3>
        <p className="text-xs text-muted-foreground">
          Mỗi từ vựng nằm trên một dòng. Hệ thống sẽ tự động tra cứu nghĩa, phiên âm và ví dụ.
        </p>
      </div>

      <Textarea
        placeholder="apple&#10;banana&#10;cherry"
        className="min-h-50 font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isLoading}
      />

      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Số lượng từ hiện tại: <strong>{text.split("\n").filter((w) => w.trim()).length}</strong>
        </span>
        <Button onClick={handleProcess} disabled={isLoading || !text.trim()}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          Bắt đầu Import tự động
        </Button>
      </div>
    </div>
  );
}
