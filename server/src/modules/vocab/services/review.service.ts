// src/modules/vocab/services/review.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CardStatus, Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SyncSessionDto } from '../dto/vocab.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(ReviewService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * ENROLL DECK
   * Copy cards từ Master Deck sang kho của User
   */
  async enrollDeck(userId: string, deckId: string) {
    const masterDeck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { cards: true },
    });

    if (!masterDeck || !masterDeck.isPublic) {
      throw new NotFoundException('Bộ thẻ không tồn tại hoặc chưa công khai');
    }

    const userExistingCards = await this.prisma.card.findMany({
      where: { userId },
      select: { word: true },
    });

    const existingWords = new Set(userExistingCards.map((c) => c.word));
    const newCards = masterDeck.cards.filter(
      (card) => !existingWords.has(card.word),
    );

    if (newCards.length === 0)
      return { message: 'Bạn đã sở hữu tất cả từ', added: 0 };

    await this.prisma.$transaction([
      this.prisma.card.createMany({
        data: newCards.map((card) => ({
          word: card.word,
          phonetic: card.phonetic,
          audioUrl: card.audioUrl,
          meanings: card.meanings as unknown as Prisma.MeaningCreateInput[],
          userId,
          deckId,
          status: CardStatus.NEW,
          repetitions: 0, // FIX: s
          easeFactor: 2.5,
          nextReview: new Date(),
        })),
      }),
      this.prisma.userStats.update({
        where: { userId },
        data: { totalWords: { increment: newCards.length } },
      }),
    ]);

    return { message: `Đã thêm ${newCards.length} từ`, added: newCards.length };
  }

  /**
   * SYNC SESSION PROGRESS
   * Quan trọng: Xóa XP, xóa ReviewLog, dùng UserStats
   */
  // src/modules/vocab/services/review.service.ts

  async syncSessionProgress(userId: string, dto: SyncSessionDto) {
    const { results, sessionId, minutesSpent = 0 } = dto;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          for (const res of results) {
            await tx.card.update({
              where: { id: res.cardId, userId },
              data: {
                status: res.status,
                interval: res.interval,
                repetitions: res.repetitions,
                easeFactor: res.easeFactor,
                nextReview: new Date(res.nextReview),
                lastReviewedAt: new Date(),
                lastRating: res.rating,
              },
            });
          }

          await tx.learningSession.update({
            where: { id: sessionId, userId },
            data: {
              endTime: new Date(),
              cardsProcessed: results.length,
              minutesSpent,
              rawResults: results as unknown as Prisma.InputJsonValue,
            },
          });

          const masteredThisSession = results.filter(
            (r) => r.status === CardStatus.MASTERED,
          ).length;
          const newlyLearned = results.filter(
            (r) => r.repetitions === 1,
          ).length;

          await tx.userStats.update({
            where: { userId },
            data: {
              totalReviews: { increment: results.length },
              masteredWords: { increment: masteredThisSession },
              learnedWords: { increment: newlyLearned },
            },
          });

          return { success: true, processed: results.length };
        },
        { timeout: 15000 },
      );
    } catch (error) {
      this.logger.error(error, 'Sync failed');
      throw new BadRequestException('Đồng bộ thất bại.');
    }
  }

  async unenrollDeck(userId: string, deckId: string) {
    const cardsToDelete = await this.prisma.card.findMany({
      where: { userId, deckId },
      select: { status: true },
    });

    if (cardsToDelete.length === 0) return { success: true };

    const total = cardsToDelete.length;
    const mastered = cardsToDelete.filter(
      (c) => c.status === CardStatus.MASTERED,
    ).length;
    const learned = cardsToDelete.filter(
      (c) => c.status !== CardStatus.NEW,
    ).length;

    await this.prisma.$transaction([
      this.prisma.card.deleteMany({ where: { userId, deckId } }),
      this.prisma.userStats.update({
        where: { userId },
        data: {
          totalWords: { decrement: total },
          masteredWords: { decrement: mastered },
          learnedWords: { decrement: learned },
        },
      }),
    ]);
    return { success: true };
  }

  /**
   * CREATE SESSION
   */
  async createLearningSession(userId: string, deckId: string) {
    const session = await this.prisma.learningSession.create({
      data: {
        userId,
        deckId,
        startTime: new Date(),
        // status: 'ONGOING' <-- XÓA VÌ SCHEMA KHÔNG CÓ
      },
    });

    const cards = await this.prisma.card.findMany({
      where: {
        userId,
        deckId,
        OR: [{ status: CardStatus.NEW }, { nextReview: { lte: new Date() } }],
      },
      take: 50,
    });

    return { sessionId: session.id, cards };
  }

  async cancelSession(userId: string, sessionId: string) {
    return this.prisma.learningSession.update({
      where: { id: sessionId, userId },
      data: {
        endTime: new Date(),
        // status: 'CANCELLED' <-- XÓA VÌ SCHEMA KHÔNG CÓ
      },
    });
  }

  // Thống kê Heatmap (Sửa lại logic lọc vì không có status 'COMPLETED')
  async getHeatmap(userId: string) {
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        userId,
        endTime: { not: null }, // Thay thế cho status: 'COMPLETED'
      },
      select: { startTime: true, cardsProcessed: true },
    });

    const heatmap: Record<string, number> = {};
    sessions.forEach((s) => {
      const date = s.startTime.toISOString().split('T')[0];
      heatmap[date] = (heatmap[date] || 0) + s.cardsProcessed;
    });
    return heatmap;
  }
  async getUserStats(userId: string) {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  async getEnrolledDecks(userId: string) {
    const cardDecks = await this.prisma.card.findMany({
      where: { userId, deckId: { not: null } },
      distinct: ['deckId'],
      select: { deckId: true },
    });

    const deckIds = cardDecks
      .map((c) => c.deckId)
      .filter((id): id is string => !!id);

    return this.prisma.deck.findMany({
      where: { id: { in: deckIds } },
      include: { _count: { select: { cards: true } } },
    });
  }

  async getReviewForecast(userId: string) {
    // 1. Lấy tất cả các thẻ đang trong quá trình học (không phải thẻ mới)
    const cards = await this.prisma.card.findMany({
      where: {
        userId,
        status: { not: CardStatus.NEW },
      },
      select: { nextReview: true },
    });

    // 2. Gom nhóm theo ngày (YYYY-MM-DD)
    const forecast: Record<string, number> = {};

    cards.forEach((card) => {
      // Chỉ lấy phần ngày, bỏ qua giờ phút giây
      const dateKey = card.nextReview.toISOString().split('T')[0];
      forecast[dateKey] = (forecast[dateKey] || 0) + 1;
    });

    // 3. Sắp xếp lại theo thứ tự thời gian để Frontend dễ vẽ biểu đồ
    const sortedForecast = Object.keys(forecast)
      .sort()
      .reduce(
        (obj, key) => {
          obj[key] = forecast[key];
          return obj;
        },
        {} as Record<string, number>,
      );

    return sortedForecast;
  }
}
