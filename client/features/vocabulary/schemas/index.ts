import * as z from "zod";

export const definitionSchema = z.object({
  definition: z.string().min(1, "Vui lòng nhập định nghĩa"),
  example: z.string().optional().or(z.literal("")),
  synonyms: z.array(z.string()).optional().default([]),
  antonyms: z.array(z.string()).optional().default([]),
});
export const meaningSchema = z.object({
  partOfSpeech: z.string().min(1, "Chọn loại từ"),
  definitions: z.array(definitionSchema).min(1, "Cần ít nhất một định nghĩa"),
});

export const deckSchema = z.object({
  title: z.string().min(2, "Tiêu đề phải ít nhất 2 ký tự"),
  description: z.string().optional(),
  levelTag: z.string().optional(),
  isPublic: z.boolean(),
});

export const cardSchema = z.object({
  word: z.string().min(1, "Từ vựng không được để trống"),
  phonetic: z.string().optional(),
  audioUrl: z.string().optional(),
  meanings: z.array(meaningSchema).min(1),
  deckId: z.string().optional(),
});

export const syncReviewSchema = z.object({
  sessionId: z.string().optional(),
  results: z.array(
    z.object({
      cardId: z.string(),
      status: z.enum(["NEW", "LEARNING", "REVIEW", "LAPSED"]),
      interval: z.number().min(0),
      repetition: z.number().min(0),
      easeFactor: z.number(),
      nextReview: z.string().datetime(),
      lastGrade: z.number().min(1).max(4),
      responseTime: z.number().optional(),
    }),
  ),
});
