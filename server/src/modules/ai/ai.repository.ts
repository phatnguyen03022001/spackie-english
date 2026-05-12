// src/modules/ai/ai.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an AI usage record.
   */
  async create(data: {
    userId: string;
    operation: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<Record<string, unknown>> {
    const input: Prisma.AiUsageUncheckedCreateInput = {
      userId: data.userId,
      operation: data.operation,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: data.cost,
    };
    const result = await this.prisma.aiUsage.create({ data: input });
    return result as unknown as Record<string, unknown>;
  }

  /**
   * Get AI usage for a user within a date range.
   */
  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<Record<string, unknown>>> {
    const result = await this.prisma.aiUsage.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    });
    return result;
  }

  /**
   * Get aggregated usage (total tokens and cost) for a user.
   */
  async getUserAggregation(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  }> {
    const result = await this.prisma.aiUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
      },
    });

    const sum = result._sum;
    return {
      totalInputTokens: sum.inputTokens ?? 0,
      totalOutputTokens: sum.outputTokens ?? 0,
      totalCost: sum.cost ?? 0,
    };
  }

  /**
   * Get daily usage summary for a user within a date range.
   */
  async getDailyUsage(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{ date: string; requests: number; tokens: number; cost: number }>
  > {
    const records = await this.prisma.aiUsage.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        inputTokens: true,
        outputTokens: true,
        cost: true,
      },
    });

    // Group by date (YYYY-MM-DD)
    const dailyMap = new Map<
      string,
      { requests: number; tokens: number; cost: number }
    >();
    for (const record of records) {
      const date = record.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(date) ?? {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
      existing.requests += 1;
      existing.tokens += record.inputTokens + record.outputTokens;
      existing.cost += record.cost;
      dailyMap.set(date, existing);
    }

    return Array.from(dailyMap.entries()).map(([date, agg]) => ({
      date,
      requests: agg.requests,
      tokens: agg.tokens,
      cost: agg.cost,
    }));
  }

  /**
   * Get total cost for all users (admin aggregation).
   */
  async getTotalSystemCost(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.aiUsage.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { cost: true },
    });
    return result._sum.cost ?? 0;
  }

  /**
   * Delete old usage records (e.g., for retention policy).
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.aiUsage.deleteMany({
      where: { createdAt: { lt: date } },
    });
    return result.count;
  }
}
