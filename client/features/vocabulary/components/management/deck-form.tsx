"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { CreateDeckSchema, CreateDeckInput, Deck } from "../../schemas";
import { DifficultyLevel } from "../../types";
import { useCreateDeck, useUpdateDeck } from "../../api/use-management";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeckFormProps {
  initialData?: Deck;
  onSuccess?: () => void;
}

// Helper function để hiển thị label trình độ (có thể để ngoài component)
const getLevelLabel = (lvl: DifficultyLevel) => {
  const labels: Record<DifficultyLevel, string> = {
    [DifficultyLevel.BEGINNER]: "Beginner (A1-A2)",
    [DifficultyLevel.INTERMEDIATE]: "Intermediate (B1-B2)",
    [DifficultyLevel.ADVANCED]: "Advanced (C1-C2)",
    [DifficultyLevel.EXAM_PREP]: "Luyện thi (IELTS/TOEIC)",
    [DifficultyLevel.COMMUNICATION]: "Giao tiếp",
  };
  return labels[lvl] || lvl;
};

export const DeckForm = ({ initialData, onSuccess }: DeckFormProps) => {
  const createMutation = useCreateDeck();
  const updateMutation = useUpdateDeck();

  const form = useForm<CreateDeckInput>({
    resolver: zodResolver(CreateDeckSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      levelTag: initialData?.levelTag || DifficultyLevel.BEGINNER,
      isPublic: initialData?.isPublic ?? false,
    },
  });

  const onSubmit = (values: CreateDeckInput) => {
    if (initialData?.id) {
      updateMutation.mutate(
        { id: initialData.id, data: values },
        {
          onSuccess: () => {
            form.reset(values);
            onSuccess?.();
          },
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Bọc fieldset quanh tất cả input để disable khi đang loading */}
        <fieldset disabled={isPending} className="space-y-5 border-none p-0">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiêu đề</FormLabel>
                <FormControl>
                  <Input placeholder="Ví dụ: IELTS Essential Verbs" {...field} />
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
                <FormLabel>Trình độ mục tiêu</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value} // Dùng value thay vì defaultValue
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn cấp độ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(DifficultyLevel).map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {getLevelLabel(lvl)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ghi chú về nội dung bộ thẻ..." {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Chế độ công khai</FormLabel>
                  <FormDescription>Cho phép người dùng khác tìm thấy bộ thẻ này.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </fieldset>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Lưu thay đổi" : "Tạo bộ thẻ ngay"}
        </Button>
      </form>
    </Form>
  );
};
