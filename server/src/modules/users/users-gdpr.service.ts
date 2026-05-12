// src/modules/users/users-gdpr.service.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import {
  GdprExportDto,
  CardProgressExportDto,
  ListeningPracticeDto,
  PaymentDto,
} from '@modules/users/dto/gdpr-export.dto';

@Injectable()
export class UsersGdprService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(UsersGdprService.name);
  }

  async exportUserData(userId: string): Promise<GdprExportDto> {
    // Fetch all user data in parallel
    const [user, decks, cardProgresses, listeningPractices, payments] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            role: true,
            provider: true,
            isVerified: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.deck.findMany({
          where: { userId, deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            visibility: true,
            totalCards: true,
            createdAt: true,
          },
        }),
        this.prisma.cardProgress.findMany({
          where: { userId },
          include: {
            globalCard: {
              select: { front: true, back: true },
            },
          },
        }),
        this.prisma.listeningPractice.findMany({
          where: { userId },
          select: {
            type: true,
            score: true,
            duration: true,
            createdAt: true,
          },
        }),
        this.prisma.payment.findMany({
          where: { userId },
          select: {
            orderCode: true,
            amount: true,
            status: true,
            plan: true,
            createdAt: true,
          },
        }),
      ]);

    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    const cards: CardProgressExportDto[] = cardProgresses.map((cp) => ({
      front: cp.globalCard.front,
      back: cp.globalCard.back || undefined,
      easeFactor: cp.easeFactor,
      interval: cp.interval,
      reviewCount: cp.reviewCount,
      createdAt: cp.firstSeenAt,
    }));

    const listeningDtos: ListeningPracticeDto[] = listeningPractices.map(
      (lp) => ({
        type: lp.type,
        score: lp.score,
        duration: lp.duration,
        createdAt: lp.createdAt,
      }),
    );

    const paymentDtos: PaymentDto[] = payments.map((p) => ({
      orderCode: p.orderCode,
      amount: p.amount,
      status: p.status,
      plan: p.plan,
      createdAt: p.createdAt,
    }));

    return {
      user: user as unknown as Record<string, unknown>,
      decks: decks as unknown as Record<string, unknown>[],
      cards,
      listeningPractices: listeningDtos,
      payments: paymentDtos,
      exportDate: new Date().toISOString(),
    };
  }
}
