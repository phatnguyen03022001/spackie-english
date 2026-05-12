// src/modules/notification/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: (data.data ?? {}) as Prisma.InputJsonValue,
      },
    });
    return notification as unknown as Record<string, unknown>;
  }

  async findByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ notifications: Array<Record<string, unknown>>; total: number }> {
    const where: Prisma.NotificationWhereInput = { userId };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications as unknown as Array<Record<string, unknown>>,
      total,
    };
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id },
      });
      return notification as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  async markAsRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
