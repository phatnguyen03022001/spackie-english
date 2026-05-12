// src/modules/favorite/favorite.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    deckId: string,
  ): Promise<Record<string, unknown>> {
    const favorite = await this.prisma.userFavorite.create({
      data: { userId, deckId },
    });
    return favorite as unknown as Record<string, unknown>;
  }

  async delete(userId: string, deckId: string): Promise<void> {
    await this.prisma.userFavorite.deleteMany({
      where: { userId, deckId },
    });
  }

  async findByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ favorites: Array<Record<string, unknown>>; total: number }> {
    const where = { userId };

    const [favorites, total] = await Promise.all([
      this.prisma.userFavorite.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userFavorite.count({ where }),
    ]);

    return {
      favorites: favorites as unknown as Array<Record<string, unknown>>,
      total,
    };
  }

  async findByUserAndDeck(
    userId: string,
    deckId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const favorite = await this.prisma.userFavorite.findFirst({
        where: { userId, deckId },
      });
      return favorite as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.userFavorite.count({ where: { userId } });
  }
}
