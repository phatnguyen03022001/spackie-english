// src/modules/report/report.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    reporterId: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string | null;
  }): Promise<Record<string, unknown>> {
    const report = await this.prisma.report.create({
      data: {
        reporterId: data.reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        description: data.description ?? null,
      },
    });
    return report as unknown as Record<string, unknown>;
  }

  async findMany(params: {
    skip: number;
    take: number;
    status?: string;
    targetType?: string;
  }): Promise<{ reports: Array<Record<string, unknown>>; total: number }> {
    const where: Prisma.ReportWhereInput = {};

    if (params.status) where.status = params.status;
    if (params.targetType) where.targetType = params.targetType;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      reports: reports as unknown as Array<Record<string, unknown>>,
      total,
    };
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    try {
      const report = await this.prisma.report.findUnique({ where: { id } });
      return report as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  async resolve(id: string, status: string, resolvedBy: string): Promise<void> {
    await this.prisma.report.update({
      where: { id },
      data: {
        status,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }
}
