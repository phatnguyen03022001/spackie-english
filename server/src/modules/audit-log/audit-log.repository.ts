// src/modules/audit-log/audit-log.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    action: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        targetId: data.targetId ?? null,
        details: (data.details ?? {}) as Prisma.InputJsonValue,
      },
    });
    return log as unknown as Record<string, unknown>;
  }

  async findMany(params: {
    skip: number;
    take: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    sort?: { field: string; order: 'asc' | 'desc' };
  }): Promise<{ logs: Array<Record<string, unknown>>; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const field = params.sort?.field ?? 'createdAt';
    const order = params.sort?.order ?? 'desc';

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { [field]: order },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs as unknown as Array<Record<string, unknown>>,
      total,
    };
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const log = await this.prisma.auditLog.findUnique({ where: { id } });
      return log as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }
}
