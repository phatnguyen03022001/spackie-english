// src/modules/payment/payment.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    return this.prisma.payment.create({ data });
  }

  async findPaymentByOrderCode(orderCode: string) {
    return this.prisma.payment.findUnique({
      where: { orderCode },
    });
  }

  async updatePayment(
    orderCode: string,
    data: Prisma.PaymentUncheckedUpdateInput,
  ) {
    return this.prisma.payment.update({ where: { orderCode }, data });
  }

  async findPaymentsByUser(userId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  async findSubscriptionByUser(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
    });
  }

  async upsertSubscription(
    userId: string,
    data: Prisma.SubscriptionUncheckedCreateInput,
  ) {
    return this.prisma.subscription.upsert({
      where: { userId },
      create: data,
      update: data,
    });
  }

  async findAllSubscriptions(skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
      this.prisma.subscription.count(),
    ]);
    return { items, total };
  }
}
