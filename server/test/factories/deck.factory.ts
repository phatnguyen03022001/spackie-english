// test/factories/deck.factory.ts
import { Deck, DeckVisibility } from '@prisma/client';
import { randomUUID } from 'crypto';

type PartialDeck = Partial<Deck>;

export class DeckFactory {
  static create(overrides: PartialDeck = {}): Deck {
    const now = new Date();
    return {
      id: randomUUID(),
      userId: randomUUID(),
      title: 'Test Deck',
      description: null,
      coverUrl: null,
      visibility: DeckVisibility.PRIVATE,
      tags: [],
      isVipOnly: false,
      totalCards: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    } as Deck;
  }

  static public(overrides: PartialDeck = {}): Deck {
    return DeckFactory.create({
      visibility: DeckVisibility.PUBLIC,
      ...overrides,
    });
  }

  static withOwner(userId: string, overrides: PartialDeck = {}): Deck {
    return DeckFactory.create({ userId, ...overrides });
  }
}
