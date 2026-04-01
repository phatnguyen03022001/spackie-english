"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Loader2, Sparkles } from "lucide-react";

// Sửa import: Sử dụng hook lẻ từ api/use-management
import { useBulkImport } from "../../api/use-management";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const BulkImportFormSchema = z.object({
  rawWords: z.string().min(1, "Vui lòng nhập ít nhất một từ vựng"),
});

type BulkImportFormInput = z.infer<typeof BulkImportFormSchema>;

export const BulkImportForm = ({ deckId, onSuccess }: { deckId: string; onSuccess?: () => void }) => {
  // Khởi tạo hook bulkImport
  const { mutate: bulkImport, isPending } = useBulkImport();

  const form = useForm<BulkImportFormInput>({
    resolver: zodResolver(BulkImportFormSchema),
    defaultValues: {
      rawWords: "",
    },
  });

  const onSubmit = (data: BulkImportFormInput) => {
    const wordsArray = data.rawWords
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (wordsArray.length === 0) {
      form.setError("rawWords", { message: "Không tìm thấy từ hợp lệ để nhập" });
      return;
    }

    if (wordsArray.length > 30) {
      form.setError("rawWords", { message: "Mỗi lần chỉ có thể nhập tối đa 30 từ để đảm bảo chất lượng AI" });
      return;
    }

    // Truyền tham số đúng cấu trúc { deckId, words } như định nghĩa trong use-management.ts
    bulkImport(
      {
        deckId,
        words: wordsArray,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rawWords"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Nhập danh sách từ vựng
                </FormLabel>
                <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground font-bold uppercase">
                  {field.value.split(/[\n,;]+/).filter((w) => w.trim()).length} / 30 từ
                </span>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Ví dụ:&#10;Resilience&#10;Serendipity, Eloquent&#10;Ubiquitous"
                  className="min-h-50 resize-none text-base leading-relaxed focus-visible:ring-violet-500"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Mỗi từ cách nhau bởi <strong>dấu phẩy</strong> hoặc <strong>xuống dòng</strong>. AI sẽ tự động trích
                xuất định nghĩa, phiên âm và ví dụ.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
          disabled={isPending}>
          {isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>AI đang trích xuất dữ liệu...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wand2 size={18} />
              <span className="font-semibold">Tự động tạo thẻ với AI</span>
            </div>
          )}
        </Button>
      </form>
    </Form>
  );
};
