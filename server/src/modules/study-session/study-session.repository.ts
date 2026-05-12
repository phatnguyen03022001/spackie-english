// src/modules/study-session/study-session.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudySessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<Record<string, unknown>> {
    const session = await this.prisma.studySession.create({
      data: { userId },
    });
    return session as unknown as Record<string, unknown>;
  }

  async findActiveByUser(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const session = await this.prisma.studySession.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });
      return session as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const session = await this.prisma.studySession.findUnique({
        where: { id },
      });
      return session as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  async endSession(
    id: string,
    endedAt: Date,
    totalDurationMs: number,
  ): Promise<void> {
    await this.prisma.studySession.update({
      where: { id },
      data: { endedAt, totalDurationMs },
    });
  }

  async incrementCardsReviewed(id: string, count: number): Promise<void> {
    await this.prisma.studySession.update({
      where: { id },
      data: { totalCardsReviewed: { increment: count } },
    });
  }
}
