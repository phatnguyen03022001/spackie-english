"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deckSchema, DeckFormData } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react"; // Thêm icon loading cho chuyên nghiệp

interface DeckFormProps {
  initialData?: Partial<DeckFormData>;
  onSubmit: (data: DeckFormData) => void;
  isLoading?: boolean;
}

export function DeckForm({ initialData, onSubmit, isLoading }: DeckFormProps) {
  const form = useForm<DeckFormData>({
    resolver: zodResolver(deckSchema),
    // Đảm bảo defaultValues khớp hoàn toàn với cấu trúc bắt buộc của Schema
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      levelTag: initialData?.levelTag || "",
      // KHÔNG ĐỂ undefined: Nếu initialData.isPublic là undefined, phải về false
      isPublic: initialData?.isPublic ?? false,
    },
  });

  // Tương tự cho useEffect reset form
  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || "",
        description: initialData.description || "",
        levelTag: initialData.levelTag || "",
        isPublic: initialData.isPublic ?? false, // Force boolean
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Tiêu đề bộ thẻ</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: 3000 từ vựng Oxford" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="levelTag"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Nhãn trình độ (Tag)</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: A1, B2, IELTS..." {...field} />
              </FormControl>
              <FormDescription>Giúp người học khác dễ dàng tìm kiếm.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Mô tả</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Mô tả ngắn gọn về nội dung hoặc mục tiêu của bộ thẻ này..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Công khai bộ thẻ</FormLabel>
                <FormDescription>Cho phép bộ thẻ xuất hiện trong danh sách công khai.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Lưu thay đổi" : "Tạo bộ thẻ ngay"}
        </Button>
      </form>
    </Form>
  );
}
