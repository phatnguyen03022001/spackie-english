"use client";

import * as z from "zod";
import { useFieldArray, useForm, Control, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, X, Volume2, AlignLeft } from "lucide-react";

import { cardSchema } from "../../schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type CardFormValues = z.input<typeof cardSchema>;
type CardFormData = z.infer<typeof cardSchema>;

interface CardFormProps {
  initialData?: Partial<CardFormValues>;
  onSubmit: (data: CardFormData) => void;
  isLoading?: boolean;
}

export function CardForm({ initialData, onSubmit, isLoading }: CardFormProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      word: initialData?.word || "",
      phonetic: initialData?.phonetic || "",
      audioUrl: initialData?.audioUrl || "",
      deckId: initialData?.deckId || "",
      meanings: initialData?.meanings || [
        {
          partOfSpeech: "",
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
    },
  });

  const {
    fields: meaningFields,
    append: appendMeaning,
    remove: removeMeaning,
  } = useFieldArray({
    control: form.control,
    name: "meanings",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data as CardFormData))} className="space-y-6">
        {/* Row 1: Word & Phonetic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="word"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Từ vựng</FormLabel>
                <FormControl>
                  <Input placeholder="Ví dụ: well-known" {...field} />
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
                <FormLabel>Phiên âm</FormLabel>
                <FormControl>
                  <Input placeholder="/ˌwɛlˈnəʊn/" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Audio URL */}
        <FormField
          control={form.control}
          name="audioUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> Link âm thanh (URL)
              </FormLabel>
              <FormControl>
                <Input placeholder="https://api.dictionaryapi.dev/..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Định nghĩa & Loại từ</h3>
          </div>

          {meaningFields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`meanings.${index}.partOfSpeech`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Loại từ (Part of Speech)</FormLabel>
                        <FormControl>
                          <Input placeholder="Adjective, Noun, Vietnamese..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMeaning(index)}
                    disabled={meaningFields.length === 1}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <DefinitionsList meaningIndex={index} control={form.control} />
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={() =>
              appendMeaning({
                partOfSpeech: "",
                definitions: [{ definition: "", example: "", synonyms: [], antonyms: [] }],
              })
            }>
            <Plus className="w-4 h-4 mr-2" /> Thêm loại từ mới
          </Button>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu thẻ học tập
        </Button>
      </form>
    </Form>
  );
}

function DefinitionsList({ meaningIndex, control }: { meaningIndex: number; control: Control<CardFormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `meanings.${meaningIndex}.definitions`,
  });

  return (
    <div className="pl-4 md:pl-6 space-y-6 border-l-2 border-muted ml-2">
      {fields.map((field, defIndex) => (
        <div key={field.id} className="space-y-4 p-4 bg-muted/20 rounded-lg relative">
          <div className="flex justify-between items-center">
            <Badge variant="outline">Định nghĩa #{defIndex + 1}</Badge>
            {fields.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(defIndex)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Ô nhập định nghĩa chính */}
          <FormField
            control={control}
            name={`meanings.${meaningIndex}.definitions.${defIndex}.definition`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase text-muted-foreground">Giải nghĩa</FormLabel>
                <FormControl>
                  <Input placeholder="Nghĩa của từ..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ô nhập Ví dụ - CỰC KỲ QUAN TRỌNG CHO VIỆC HỌC */}
          <FormField
            control={control}
            name={`meanings.${meaningIndex}.definitions.${defIndex}.example`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <AlignLeft className="w-3 h-3" /> Ví dụ minh họa
                </FormLabel>
                <FormControl>
                  <Input
                    className="italic"
                    placeholder="Ví dụ: He is a well-known author."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TagInput
              label="Từ đồng nghĩa"
              control={control}
              name={`meanings.${meaningIndex}.definitions.${defIndex}.synonyms` as const}
            />
            <TagInput
              label="Từ trái nghĩa"
              control={control}
              name={`meanings.${meaningIndex}.definitions.${defIndex}.antonyms` as const}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full border-dashed border-2 hover:bg-primary/5"
        onClick={() => append({ definition: "", example: "", synonyms: [], antonyms: [] })}>
        <Plus className="w-3 h-3 mr-2" /> Thêm định nghĩa cho loại từ này
      </Button>
    </div>
  );
}

function TagInput<T extends CardFormValues>({
  label,
  control,
  name,
}: {
  label: string;
  control: Control<T>;
  name: FieldPath<T>;
}) {
  const [val, setVal] = useState("");

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const tags = (field.value as string[]) || [];

        return (
          <FormItem>
            <FormLabel className="text-[10px] uppercase text-muted-foreground">{label}</FormLabel>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
              {tags.map((tag, i) => (
                <Badge key={`${tag}-${i}`} variant="secondary" className="text-[10px] py-0 px-1 pr-0">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => {
                      const next = [...tags];
                      next.splice(i, 1);
                      field.onChange(next);
                    }}>
                    <X className="w-2 h-2" />
                  </Button>
                </Badge>
              ))}
            </div>
            <FormControl>
              <Input
                className="h-8 text-xs"
                placeholder="Nhấn Enter để thêm tag"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = val.trim();
                    if (trimmed && !tags.includes(trimmed)) {
                      field.onChange([...tags, trimmed]);
                      setVal("");
                    }
                  }
                }}
              />
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
}
