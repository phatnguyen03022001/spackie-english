// src/modules/study/interfaces/study.interface.ts
import type { CardRating } from '@prisma/client';

export interface IStudySM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
}

export interface IStreakInfo {
  currentStreak: number;
  longestStreak: number;
}

export interface IDueCardItem {
  globalCardId: string;
  front: string;
  back?: string;
  imageUrl?: string;
  audioUrl?: string;
  extras: Record<string, unknown>;
  progress: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueDate: Date;
    lastRating?: CardRating;
    reviewCount: number;
  };
}
