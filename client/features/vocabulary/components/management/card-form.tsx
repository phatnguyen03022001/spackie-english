"use client";

import React from "react";
import { useForm, useFieldArray, Control, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, BookOpen, Speaker, Type } from "lucide-react";

import { CreateCardSchema, CreateCardInput } from "../../schemas";
import { useAddCard } from "../../api/use-management";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface CardFormProps {
  deckId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DefinitionFields = ({
  meaningIndex,
  control,
  disabled,
}: {
  meaningIndex: number;
  control: Control<CreateCardInput>;
  disabled: boolean;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `meanings.${meaningIndex}.definitions` as const,
  });

  return (
    <div className="space-y-4 pt-2">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="relative group p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => remove(index)}
              disabled={fields.length === 1 || disabled}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4">
            <FormField
              control={control}
              name={`meanings.${meaningIndex}.definitions.${index}.definition`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground">ĐỊNH NGHĨA #{index + 1}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Nhập ý nghĩa của từ..."
                      className="bg-background resize-none"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`meanings.${meaningIndex}.definitions.${index}.example`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground">VÍ DỤ</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Câu ví dụ thực tế..."
                      className="bg-background"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={control}
                name={`meanings.${meaningIndex}.definitions.${index}.synonyms`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground">TỪ ĐỒNG NGHĨA</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value?.join(", ") || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="cách nhau bằng dấu phẩy"
                        className="bg-background"
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`meanings.${meaningIndex}.definitions.${index}.antonyms`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground">TỪ TRÁI NGHĨA</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value?.join(", ") || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="cách nhau bằng dấu phẩy"
                        className="bg-background"
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full border-dashed bg-background/50 hover:bg-accent"
        onClick={() => append({ definition: "", example: "", synonyms: [], antonyms: [] })}
        disabled={disabled}>
        <Plus className="mr-2 h-3 w-3" />
        Thêm định nghĩa cho loại từ này
      </Button>
    </div>
  );
};

export const CardForm = ({ deckId, onSuccess, onCancel }: CardFormProps) => {
  const addCard = useAddCard();

  const defaultValues = {
    word: "",
    phonetic: "",
    audioUrl: null,
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "",
            example: "",
            synonyms: [],
            antonyms: [],
          },
        ],
      },
    ],
  } as CreateCardInput;

  const form = useForm<CreateCardInput>({
    resolver: zodResolver(CreateCardSchema) as Resolver<CreateCardInput>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "meanings",
  });

  const onSubmit: SubmitHandler<CreateCardInput> = async (values) => {
    try {
      const cleanedValues = {
        ...values,
        audioUrl: values.audioUrl?.trim() || null,
        meanings: values.meanings.map((m) => ({
          ...m,
          definitions: m.definitions.map((d) => ({
            ...d,
            example: d.example ?? "",
            synonyms: Array.isArray(d.synonyms) ? d.synonyms : [],
            antonyms: Array.isArray(d.antonyms) ? d.antonyms : [],
          })),
        })),
      };
      await addCard.mutateAsync({ deckId, data: cleanedValues as CreateCardInput });
      onSuccess?.();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const isPending = addCard.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Thông tin cơ bản */}
        <UICard className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" /> Thông tin cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="word"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Từ vựng</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ví dụ: Metaphor" className="h-10" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phonetic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Phiên âm</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="/ˈmet.ə.fɔːr/"
                        className="h-10"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="audioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium flex items-center gap-2">
                    <Speaker className="h-4 w-4" /> Link phát âm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="https://..."
                      className="h-10"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>Link âm thanh từ từ điển (MP3, WAV...)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </UICard>

        <Separator />

        {/* Section 2: Nghĩa và Phân loại */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Nghĩa của từ
            </h3>
            <Badge variant="secondary" className="px-3 py-1 font-normal">
              {fields.length} loại từ
            </Badge>
          </div>

          <div className="space-y-8">
            {fields.map((field, index) => (
              <UICard key={field.id} className="overflow-hidden border-l-4 border-l-primary shadow-md">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1 max-w-50">
                      <FormField
                        control={form.control}
                        name={`meanings.${index}.partOfSpeech`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-primary">Từ loại</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="noun, verb..."
                                className="h-9 font-semibold"
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1 || isPending}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" /> Xóa loại từ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <DefinitionFields meaningIndex={index} control={form.control} disabled={isPending} />
                </CardContent>
              </UICard>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full py-8 border-2 border-dashed hover:border-primary hover:text-primary transition-all bg-background"
            onClick={() =>
              append({ partOfSpeech: "", definitions: [{ definition: "", example: "", synonyms: [], antonyms: [] }] })
            }
            disabled={isPending}>
            <Plus className="mr-2 h-5 w-5" /> Thêm một loại từ mới (Ví dụ: Động từ)
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 border-t z-10">
          <Button type="submit" size="lg" className="flex-1 shadow-lg shadow-primary/20" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang lưu...
              </>
            ) : (
              "Tạo thẻ Flashcard"
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isPending}>
              Hủy
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};
