// src/app/[locale]/(dashboard)/[role]/vocabulary/manage/import/page.tsx

"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Send, Languages, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBulkImport } from "@/features/vocabulary/api/use-management"; // Điều chỉnh đường dẫn export hook của bạn

export default function BulkImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");

  const [rawText, setRawText] = useState("");
  const bulkImport = useBulkImport();

  // Xử lý logic tách từ từ Textarea (mỗi dòng một từ)
  const handleImport = async () => {
    if (!deckId) {
      toast.error("Không tìm thấy ID bộ thẻ để import.");
      return;
    }

    const words = rawText
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      toast.error("Vui lòng nhập ít nhất một từ vựng.");
      return;
    }

    if (words.length > 30) {
      toast.error("Mỗi lần chỉ có thể import tối đa 30 từ.");
      return;
    }

    try {
      const result = await bulkImport.mutateAsync({
        deckId,
        words,
      });

      toast.success(`Đã thêm thành công ${result.addedCount} từ vào bộ thẻ!`);

      // Chuyển hướng về trang chi tiết bộ thẻ sau khi import xong
      router.push(`../manage/${deckId}`);
    } catch (error) {
      console.error("Bulk import failed:", error);
      // Toast error thường đã được xử lý trong hook, nếu chưa có thì bổ sung ở đây
    }
  };

  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Import hàng loạt</h1>
        <p className="text-muted-foreground font-medium">
          Hệ thống sẽ tự động sử dụng AI để tra cứu nghĩa, phiên âm và ví dụ cho danh sách từ của bạn.
        </p>
      </div>

      <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary rounded-lg text-primary-foreground">
              <Languages className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl font-bold">Danh sách từ vựng</CardTitle>
          </div>
          <CardDescription className="text-base font-medium">
            Nhập mỗi từ trên một dòng (Tối đa 30 từ mỗi lần).
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8">
          <Textarea
            placeholder="apple&#10;banana&#10;orange..."
            className="min-h-[300px] text-lg font-medium rounded-2xl border-2 focus-visible:ring-primary p-6"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={bulkImport.isPending}
          />

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground font-bold italic">
            <AlertCircle className="h-4 w-4" />
            <span>Lưu ý: Các từ đã tồn tại trong bộ thẻ của bạn sẽ được tự động bỏ qua.</span>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 border-t p-6 flex justify-between items-center">
          <Button
            variant="ghost"
            className="rounded-xl font-bold"
            onClick={() => router.back()}
            disabled={bulkImport.isPending}>
            Quay lại
          </Button>

          <Button
            onClick={handleImport}
            disabled={bulkImport.isPending || !rawText.trim()}
            className="rounded-xl font-bold px-8 h-12 shadow-lg shadow-primary/20">
            {bulkImport.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang xử lý AI...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Bắt đầu Import
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Hiển thị hướng dẫn nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Alert className="rounded-2xl border-none bg-blue-50 text-blue-800">
          <CheckCircle2 className="h-4 w-4 stroke-blue-800" />
          <AlertTitle className="font-bold">Tự động hóa</AlertTitle>
          <AlertDescription className="font-medium">
            Tự động lấy phiên âm IPA và audio từ từ điển Oxford/Google.
          </AlertDescription>
        </Alert>
        <Alert className="rounded-2xl border-none bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 stroke-green-800" />
          <AlertTitle className="font-bold">Dịch thuật</AlertTitle>
          <AlertDescription className="font-medium">
            Tự động dịch nghĩa sang tiếng Việt phù hợp ngữ cảnh phổ biến.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
