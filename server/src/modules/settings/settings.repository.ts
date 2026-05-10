// src/modules/settings/settings.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get stored settings JSON for a user.
   */
  async findByUserId(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    return (user?.settings as Record<string, unknown>) ?? {};
  }

  /**
   * Update settings JSON for a user (partial merge).
   */
  async update(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { settings: data as Prisma.InputJsonValue },
      select: { settings: true },
    });
    return (user.settings as Record<string, unknown>) ?? {};
  }

  /**
   * Reset settings to empty object (will be merged with defaults on read).
   */
  async reset(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: {} },
    });
  }
}
