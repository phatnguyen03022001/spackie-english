// src/modules/vocab/services/review.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CardStatus, DifficultyLevel, Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SyncSessionDto } from '../dto/vocab.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(ReviewService.name)
    private readonly logger: PinoLogger,
  ) {}

  // ================================
  // ENROLL / UNENROLL DECK
  // ================================

  // Trong review.service.ts
  async enrollDeck(userId: string, deckId: string) {
    const masterDeck = await this.prisma.deck.findUnique({
      where: { id: deckId, isPublic: true },
      include: { cards: { include: { word: true } } },
    });
    if (!masterDeck)
      throw new NotFoundException('Bộ thẻ không tồn tại hoặc chưa công khai');

    const masterWordIds = masterDeck.cards.map((card) => card.wordId);
    const existingCards = await this.prisma.card.findMany({
      where: { userId, wordId: { in: masterWordIds } },
      select: { wordId: true, id: true },
    });
    const existingWordIdMap = new Map(
      existingCards.map((c) => [c.wordId, c.id]),
    );
    const newWordIds = masterWordIds.filter((id) => !existingWordIdMap.has(id));

    // Không gán deckId cho card đã tồn tại để tránh phá cấu trúc deck hiện tại.
    // Chỉ thêm card mới với từ chưa có.
    if (newWordIds.length === 0) {
      return {
        message: 'Đăng ký deck thành công',
        added: 0,
        existing: existingCards.length,
      };
    }

    await this.prisma.ensureUserStatsExist(userId);
    await this.prisma.$transaction([
      this.prisma.card.createMany({
        data: newWordIds.map((wordId) => ({
          wordId,
          userId,
          deckId,
          status: CardStatus.NEW,
          repetitions: 0,
          easeFactor: 2.5,
          nextReview: new Date(),
        })),
      }),
      this.prisma.userStats.update({
        where: { userId },
        data: { totalWords: { increment: newWordIds.length } },
      }),
    ]);

    return {
      message: `Đăng ký deck thành công. Đã thêm ${newWordIds.length} từ mới, ${existingCards.length} từ đã tồn tại không thay đổi deck.`,
      added: newWordIds.length,
      existing: existingCards.length,
    };
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

  // ================================
  // GET DECKS & CARDS
  // ================================

  async getDeckWithCards(deckId: string, userId: string, limit = 50, page = 1) {
    const take = Math.min(Math.max(limit, 1), 100); // Giới hạn tối đa 100 cho preview
    const skip = Math.max(page - 1, 0) * take;

    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        cards: {
          where: { userId }, // Chỉ lấy cards của user đang xem
          include: { word: true },
          take,
          skip,
          orderBy: { createdAt: 'asc' },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!deck) return null;

    const totalCards = await this.prisma.card.count({
      where: { userId, deckId },
    });

    // Kiểm tra user đã enroll chưa
    const enrolled = await this.prisma.card.findFirst({
      where: { userId, deckId },
      select: { id: true },
    });

    const lastPage = Math.max(1, Math.ceil(totalCards / take));

    return {
      ...deck,
      isEnrolled: !!enrolled,
      meta: {
        totalCards,
        page,
        lastPage,
      },
    };
  }

  async getEnrolledDecks(userId: string) {
    // Lấy danh sách deckId mà user có card
    const userDecks = await this.prisma.card.findMany({
      where: { userId, deckId: { not: null } },
      distinct: ['deckId'],
      select: { deckId: true },
    });

    const deckIds = userDecks
      .map((d) => d.deckId)
      .filter((id): id is string => !!id);

    if (deckIds.length === 0) return [];

    return this.prisma.deck.findMany({
      where: { id: { in: deckIds } },
      include: { _count: { select: { cards: true } } },
    });
  }

  async findPublicDecks(
    userId: string,
    search?: string,
    tag?: DifficultyLevel,
    page: number = 1,
    limit: number = 10,
  ) {
    limit = Math.min(limit, 100); // Giới hạn tối đa 100 để tránh query quá lớn
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const whereClause: Prisma.DeckWhereInput = {
      isPublic: true,
      AND: [
        search ? { title: { contains: search, mode: 'insensitive' } } : {},
        tag ? { levelTag: tag } : {},
      ],
    };

    // Lấy danh sách deckId mà user đã enroll (có card)
    const enrolledDeckIds = await this.prisma.card
      .findMany({
        where: { userId, deckId: { not: null } },
        distinct: ['deckId'],
        select: { deckId: true },
      })
      .then((cards) =>
        cards.map((c) => c.deckId).filter((id): id is string => !!id),
      );

    const enrolledSet = new Set(enrolledDeckIds);

    const [items, total] = await Promise.all([
      this.prisma.deck.findMany({
        where: whereClause,
        include: {
          _count: { select: { cards: true } },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          // KHÔNG include enrollments vì không có model này
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deck.count({ where: whereClause }),
    ]);

    // Thêm trường isEnrolled
    const itemsWithEnrolled = items.map((deck) => ({
      ...deck,
      isEnrolled: enrolledSet.has(deck.id),
    }));

    return {
      items: itemsWithEnrolled,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / take),
      },
    };
  }

  // ================================
  // LEARNING SESSION
  // ================================

  async createLearningSession(
    userId: string,
    deckId: string,
    mode: string = 'default',
    limit: number = 50,
    page: number = 1,
  ) {
    // Kiểm tra user có ít nhất một card trong deck không
    const hasCards = await this.prisma.card.findFirst({
      where: { userId, deckId },
      select: { id: true },
    });
    if (!hasCards) {
      throw new BadRequestException('Bạn chưa có thẻ nào trong bộ thẻ này');
    }

    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(page - 1, 0) * take;
    let whereCondition: Prisma.CardWhereInput = { userId, deckId };

    switch (mode) {
      case 'all':
        // Lấy tất cả thẻ (không thêm điều kiện)
        break;
      case 'hard':
        whereCondition = { ...whereCondition, easeFactor: { lt: 2.3 } };
        break;
      case 'recent':
        whereCondition = {
          ...whereCondition,
          lastReviewedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        };
        break;
      case 'preview':
        whereCondition = { ...whereCondition, status: CardStatus.NEW };
        break;
      default:
        whereCondition = {
          ...whereCondition,
          OR: [{ status: CardStatus.NEW }, { nextReview: { lte: new Date() } }],
        };
    }

    // Chỉ lấy cards MỘT LẦN duy nhất
    const cards = await this.prisma.card.findMany({
      where: whereCondition,
      take,
      skip,
      include: { word: true },
    });

    // Tạo session
    const session = await this.prisma.learningSession.create({
      data: {
        userId,
        deckId,
        startTime: new Date(),
      },
    });

    return { sessionId: session.id, cards };
  }

  async syncSessionProgress(userId: string, dto: SyncSessionDto) {
    const { results, sessionId, minutesSpent = 0 } = dto;
    if (!results.length) return { success: true, processed: 0 };

    // Đảm bảo record userStats luôn tồn tại
    await this.prisma.ensureUserStatsExist(userId);

    // Kiểm tra session chưa kết thúc và xác thực deckId tương ứng
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.endTime) {
      throw new BadRequestException('Session không hợp lệ hoặc đã kết thúc');
    }
    if (session.deckId !== dto.deckId) {
      throw new BadRequestException(
        'Session không thuộc về deck được chỉ định',
      );
    }

    return await this.prisma.$transaction(
      async (tx) => {
        const cardIds = results.map((r) => r.cardId);
        const oldCards = await tx.card.findMany({
          where: { id: { in: cardIds }, userId },
          select: {
            id: true,
            repetitions: true,
            interval: true,
            easeFactor: true,
            status: true,
          },
        });
        const oldCardMap = new Map(oldCards.map((c) => [c.id, c]));

        const updates = [];
        let newlyLearned = 0;
        let newlyMastered = 0;

        for (const res of results) {
          const oldCard = oldCardMap.get(res.cardId);
          if (!oldCard) throw new Error(`Card ${res.cardId} not found`);

          // Tính toán SM-2 từ rating
          const { easeFactor, repetitions, interval, status, nextReview } =
            this.calculateSM2(oldCard, res.rating);

          // Cập nhật card
          updates.push(
            tx.card.update({
              where: { id: res.cardId },
              data: {
                status,
                interval,
                repetitions,
                easeFactor,
                nextReview,
                lastRating: res.rating,
                lastReviewedAt: new Date(),
              },
            }),
          );

          // Tạo review log
          updates.push(
            tx.reviewLog.create({
              data: {
                cardId: res.cardId,
                userId,
                rating: res.rating,
                intervalBefore: oldCard.interval,
                intervalAfter: interval,
                repetitionsBefore: oldCard.repetitions,
                repetitionsAfter: repetitions,
              },
            }),
          );

          // Tính toán stats
          if (oldCard.repetitions === 0 && repetitions > 0) newlyLearned++;
          if (
            oldCard.status !== CardStatus.MASTERED &&
            status === CardStatus.MASTERED
          )
            newlyMastered++;
        }

        await Promise.all(updates);

        // Cập nhật session
        const rawResults: Prisma.JsonValue = results.map((res) => ({
          cardId: res.cardId,
          status: res.status,
          interval: res.interval,
          repetitions: res.repetitions,
          easeFactor: res.easeFactor,
          rating: res.rating,
          nextReview: res.nextReview,
        }));

        await tx.learningSession.update({
          where: { id: sessionId },
          data: {
            endTime: new Date(),
            cardsProcessed: results.length,
            minutesSpent,
            rawResults,
          },
        });

        // Cập nhật user stats
        await tx.userStats.update({
          where: { userId },
          data: {
            totalReviews: { increment: results.length },
            learnedWords: { increment: newlyLearned },
            masteredWords: { increment: newlyMastered },
            lastStudyDate: new Date(),
          },
        });

        return { success: true, processed: results.length };
      },
      { timeout: 15000 },
    );
  }

  async cancelSession(userId: string, sessionId: string) {
    return this.prisma.learningSession.update({
      where: { id: sessionId, userId },
      data: {
        endTime: new Date(),
      },
    });
  }

  // ================================
  // STATISTICS
  // ================================

  async getUserStats(userId: string) {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  async getDueCount(userId: string) {
    const count = await this.prisma.card.count({
      where: {
        userId,
        nextReview: { lte: new Date() },
      },
    });
    return { dueCount: count };
  }

  async getReviewForecast(userId: string) {
    const cards = await this.prisma.card.findMany({
      where: {
        userId,
        status: { not: CardStatus.NEW },
      },
      select: { nextReview: true },
    });

    const forecast: Record<string, number> = {};
    cards.forEach((card) => {
      const dateKey = card.nextReview.toISOString().split('T')[0];
      forecast[dateKey] = (forecast[dateKey] || 0) + 1;
    });

    return forecast;
  }

  async getHeatmap(userId: string) {
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        userId,
        endTime: { not: null },
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

  // ================================
  // HELPERS
  // ================================

  private calculateSM2(
    oldCard: { repetitions: number; interval: number; easeFactor: number },
    rating: number,
  ) {
    let { easeFactor, repetitions, interval } = oldCard;

    // Cập nhật ease factor
    easeFactor =
      easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    if (rating >= 3) {
      // Correct
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      repetitions++;
    } else {
      // Incorrect
      repetitions = 0;
      interval = 1;
    }

    // Xác định status dựa trên repetitions/interval theo SM-2 giai đoạn:
    // NEW (chưa học), LEARNING (mới bắt đầu), REVIEW (ôn tập), MASTERED.
    let status: CardStatus;
    if (repetitions === 0) {
      status = CardStatus.NEW;
    } else if (repetitions === 1) {
      // Lần đầu trả lời đúng: vẫn xem là giai đoạn học (LEARNING)
      status = CardStatus.LEARNING;
    } else if (interval <= 1) {
      status = CardStatus.LEARNING;
    } else if (interval <= 30) {
      status = CardStatus.REVIEW;
    } else {
      status = CardStatus.MASTERED;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return { easeFactor, repetitions, interval, status, nextReview };
  }
}
