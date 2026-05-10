// src/modules/listening/listening.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ListeningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPractice(data: Prisma.ListeningPracticeUncheckedCreateInput) {
    return this.prisma.listeningPractice.create({ data });
  }

  async findPracticeById(id: string) {
    return this.prisma.listeningPractice.findUnique({
      where: { id },
      include: {
        globalCard: { select: { id: true, front: true, back: true } },
      },
    });
  }

  async updatePractice(
    id: string,
    data: Prisma.ListeningPracticeUncheckedUpdateInput,
  ) {
    return this.prisma.listeningPractice.update({ where: { id }, data });
  }

  async findHistoryByUser(userId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.listeningPractice.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { globalCard: { select: { id: true, front: true } } },
      }),
      this.prisma.listeningPractice.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  async getUserStats(userId: string) {
    const practices = await this.prisma.listeningPractice.findMany({
      where: { userId },
      select: { score: true, accuracy: true, duration: true },
    });

    const totalPractices = practices.length;
    if (totalPractices === 0) {
      return {
        totalPractices,
        averageScore: 0,
        averageAccuracy: 0,
        totalDuration: 0,
      };
    }

    const averageScore =
      practices.reduce((sum, p) => sum + (p.score ?? 0), 0) / totalPractices;
    const averageAccuracy =
      practices.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) / totalPractices;
    const totalDuration = practices.reduce(
      (sum, p) => sum + (p.duration ?? 0),
      0,
    );

    return { totalPractices, averageScore, averageAccuracy, totalDuration };
  }
}
