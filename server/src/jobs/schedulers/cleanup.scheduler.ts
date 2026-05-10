// src/jobs/schedulers/cleanup.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class CleanupScheduler {
  private readonly logger = new Logger(CleanupScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Delete expired OTPs every day at 2:00 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deleteExpiredOtps(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.otp.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired OTPs`);
    }
  }

  /**
   * Delete orphaned File records (no refId) older than 30 days, every week.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async deleteOrphanedFiles(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const files = await this.prisma.file.findMany({
      where: {
        refId: null,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    if (files.length === 0) {
      return;
    }

    // Delete file records (storage cleanup is optional – Cloudinary handles retention)
    const ids = files.map((f) => f.id);
    await this.prisma.file.deleteMany({
      where: { id: { in: ids } },
    });

    this.logger.log(`Deleted ${files.length} orphaned file records`);
  }
}
