// src/modules/activity/activity.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const activity = await this.prisma.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        targetId: data.targetId ?? null,
        details: (data.details ?? {}) as Prisma.InputJsonValue,
      },
    });
    return activity as unknown as Record<string, unknown>;
  }

  async findByUser(
    userId: string,
    skip: number,
    take: number,
    type?: string,
  ): Promise<{ activities: Array<Record<string, unknown>>; total: number }> {
    const where: Prisma.UserActivityWhereInput = { userId };

    if (type) where.type = type;

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      activities: activities as unknown as Array<Record<string, unknown>>,
      total,
    };
  }
}
