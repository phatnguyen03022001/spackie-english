// src/modules/decks/interfaces/deck.interface.ts
import type { DeckVisibility } from '@prisma/client';

export interface IDeck {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  visibility: DeckVisibility;
  tags: string[];
  isVipOnly: boolean;
  totalCards: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
