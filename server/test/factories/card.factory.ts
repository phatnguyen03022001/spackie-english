// test/factories/card.factory.ts
import { GlobalCard } from '@prisma/client';
import { randomUUID } from 'crypto';

type PartialCard = Partial<GlobalCard>;

export class CardFactory {
  static create(overrides: PartialCard = {}): GlobalCard {
    const now = new Date();
    return {
      id: randomUUID(),
      front: `word-${randomUUID().slice(0, 8)}`,
      back: null,
      imageUrl: null,
      audioUrl: null,
      extras: {},
      status: 'pending',
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    } as GlobalCard;
  }

  static completed(overrides: PartialCard = {}): GlobalCard {
    return CardFactory.create({
      status: 'completed',
      back: 'nghĩa của từ',
      ...overrides,
    });
  }

  static withFront(front: string, overrides: PartialCard = {}): GlobalCard {
    return CardFactory.create({ front, ...overrides });
  }
}
