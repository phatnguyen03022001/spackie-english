import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { CardStatus, Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    @InjectPinoLogger(ReviewService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * ENROLL DECK: Clone cards từ Master Deck sang lộ trình của User
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

    if (newCards.length === 0) {
      return {
        message: 'Bạn đã sở hữu tất cả từ vựng trong bộ thẻ này',
        totalCards: 0,
      };
    }

    try {
      await this.prisma.$transaction(
        newCards.map((card) =>
          this.prisma.card.create({
            data: {
              word: card.word,
              phonetic: card.phonetic,
              audioUrl: card.audioUrl,
              // Sử dụng unknown trước khi ép kiểu về Prisma Input để an toàn với ESLint
              meanings: card.meanings as unknown as Prisma.MeaningCreateInput[],
              user: { connect: { id: userId } },
              deck: { connect: { id: deckId } },
              status: CardStatus.NEW,
              interval: 0,
              repetition: 0,
              easeFactor: 2.5,
              nextReview: new Date(),
            },
          }),
        ),
      );

      return {
        message: `Đã thêm ${newCards.length} từ mới từ bộ thẻ "${masterDeck.title}"`,
        totalCards: newCards.length,
      };
    } catch (error: unknown) {
      this.logger.error({ error }, 'Enroll Deck Transaction Failed');
      throw new BadRequestException('Không thể kích hoạt bộ thẻ này.');
    }
  }

  /**
   * PROCESS ANSWER: Thuật toán Spaced Repetition (SM-2)
   */
  async processAnswer(userId: string, cardId: string, grade: number) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) throw new NotFoundException('Thẻ không tồn tại');

    let { interval, repetition, easeFactor, status } = card;
    let nextReview = new Date();

    if (grade < 3) {
      repetition = 0;
      interval = 0;
      status = CardStatus.LAPSED;
      nextReview = new Date(Date.now() + 10 * 60 * 1000);

      if (grade === 1) easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else {
      if (repetition === 0) {
        interval = grade === 4 ? 4 : 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }

      repetition++;
      status = CardStatus.REVIEW;

      nextReview = new Date();
      nextReview.setUTCHours(0, 0, 0, 0);
      nextReview.setDate(nextReview.getDate() + interval);

      if (grade === 4) easeFactor += 0.15;
    }

    return this.prisma.card.update({
      where: { id: cardId },
      data: {
        interval,
        repetition,
        easeFactor,
        status,
        nextReview,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * BULK SYNC: Đồng bộ kết quả hàng loạt từ Next.js
   */
  async bulkProcessAnswers(
    userId: string,
    results: { cardId: string; grade: number }[],
  ) {
    if (!results.length) return { success: true, xpEarned: 0 };

    let totalXpEarned = 0;

    try {
      for (const res of results) {
        await this.processAnswer(userId, res.cardId, res.grade);
        if (res.grade >= 3) totalXpEarned += 10;
      }

      await this.usersService.addXp(userId, totalXpEarned);

      return { success: true, xpEarned: totalXpEarned };
    } catch (error: unknown) {
      this.logger.error({ error }, 'Bulk Sync Failed');
      throw new BadRequestException('Đồng bộ kết quả thất bại.');
    }
  }

  /**
   * GET TODAY REVIEWS: Lấy danh sách từ cần học hôm nay
   */
  async getTodayReviews(userId: string) {
    return this.prisma.card.findMany({
      where: {
        userId,
        nextReview: { lte: new Date() },
      },
      orderBy: [{ status: 'desc' }, { nextReview: 'asc' }],
    });
  }

  /**
   * GET ENROLLED DECKS: Lấy danh sách bộ thẻ User đang học
   */
  async getEnrolledDecks(userId: string) {
    // FIX: Loại bỏ 'as string' dư thừa và lọc null bằng filter(Boolean)
    const cardDecks = await this.prisma.card.findMany({
      where: { userId, deckId: { not: null } },
      distinct: ['deckId'],
      select: { deckId: true },
    });

    const deckIds = cardDecks
      .map((c) => c.deckId)
      .filter((id): id is string => id !== null);

    return this.prisma.deck.findMany({
      where: { id: { in: deckIds } },
      include: {
        _count: { select: { cards: true } },
      },
    });
  }

  /**
   * UNENROLL DECK: Xóa các card thuộc bộ thẻ đó khỏi User
   */
  async unenrollDeck(userId: string, deckId: string) {
    const deleted = await this.prisma.card.deleteMany({
      where: { userId, deckId },
    });
    return {
      message: `Đã xóa ${deleted.count} thẻ khỏi lộ trình.`,
      count: deleted.count,
    };
  }

  /**
   * GET REVIEW STATS: Thống kê trạng thái học tập
   */
  async getReviewStats(userId: string) {
    const stats = await this.prisma.card.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    const result: Record<string, number> = {
      NEW: 0,
      REVIEW: 0,
      LAPSED: 0,
    };

    stats.forEach((curr) => {
      result[curr.status] = curr._count;
    });

    return result;
  }
}
