// src/modules/vocab/services/management.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CardStatus, Prisma, UserRole } from '@prisma/client';
import { typedAxiosGet } from '@common/utils/axios-typed';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import {
  MeaningDto,
  CreateDeckDto,
  CreateWordDto,
  UpdateCardDto,
  UpdateDeckDto,
  CreateCardWithWordIdDto,
} from '../dto/vocab.dto';
import { RequestUser } from '@/common/interfaces/request-user.interface';

interface IMyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished: boolean;
  mt_translation: string | null;
  responseStatus: number | string; // Đôi khi nó trả về string "200"
  responseDetails: string;
}

interface IDictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }[];
  }[];
}

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(ManagementService.name)
    private readonly logger: PinoLogger,
  ) {}

  async findTeacherDecks(teacherId: string) {
    return this.prisma.deck.findMany({
      where: { creatorId: teacherId },
      include: { _count: { select: { cards: true } } },
    });
  }

  async getDeckWithCards(deckId: string, userId: string, limit = 50, page = 1) {
    const take = Math.min(Math.max(limit, 1), 100);
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

    // Sửa: Đếm chỉ cards của user hiện tại
    const totalCards = await this.prisma.card.count({
      where: { userId, deckId },
    });

    const enrolled = await this.prisma.card.findFirst({
      where: { userId, deckId },
      select: { id: true },
    });

    const lastPage = Math.max(1, Math.ceil(totalCards / take));

    return {
      ...deck,
      isEnrolled: !!enrolled,
      meta: {
        totalCards, // Chỉ số cards của user hiện tại
        page,
        lastPage,
      },
    };
  }

  async updateDeckStatus(id: string, isPublic: boolean, user: RequestUser) {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');

    // Logic kiểm tra quyền: Admin hoặc Chủ sở hữu
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = deck.creatorId === user.id;

    if (!isAdmin && !isOwner) {
      throw new BadRequestException(
        'Bạn không có quyền thay đổi trạng thái bộ thẻ này',
      );
    }

    return this.prisma.deck.update({
      where: { id },
      data: { isPublic },
    });
  }

  async updateDeckMetadata(id: string, dto: UpdateDeckDto, user: RequestUser) {
    const where =
      user.role === UserRole.ADMIN ? { id } : { id, creatorId: user.id };

    const deck = await this.prisma.deck.findFirst({ where });
    if (!deck) throw new NotFoundException('Deck not found');

    return this.prisma.deck.update({
      where: { id },
      data: dto,
    });
  }

  async updateCard(cardId: string, dto: UpdateCardDto, user: RequestUser) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Thẻ không tồn tại');
    if (user.role !== UserRole.ADMIN && card.userId !== user.id) {
      throw new BadRequestException('Bạn không có quyền chỉnh sửa thẻ này');
    }

    const data: Prisma.CardUpdateInput = {};
    if (dto.deckId !== undefined) {
      if (dto.deckId === null) {
        data.deck = { disconnect: true };
      } else {
        // Kiểm tra deck tồn tại
        const deckExists = await this.prisma.deck.findUnique({
          where: { id: dto.deckId },
          select: { id: true },
        });
        if (!deckExists) {
          throw new NotFoundException('Bộ thẻ không tồn tại');
        }
        data.deck = { connect: { id: dto.deckId } };
      }
    }

    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.card.update({
      where: { id: cardId },
      data,
      include: { word: true },
    });
  }

  async createDeck(creatorId: string, dto: CreateDeckDto) {
    return this.prisma.deck.create({
      data: { ...dto, creatorId },
    });
  }

  async deleteMasterDeck(id: string, user: RequestUser) {
    const where =
      user.role === UserRole.ADMIN ? { id } : { id, creatorId: user.id };
    const deck = await this.prisma.deck.findFirst({ where });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');

    // Kiểm tra tổng số card liên quan tới deck này (tất cả người dùng)
    const totalDeckCards = await this.prisma.card.count({
      where: { deckId: id },
    });

    if (totalDeckCards > 0) {
      // Bảo vệ dữ liệu học của người dùng khác:
      // không xóa card, chỉ dissociate deckId để giữ progress.
      await this.prisma.card.updateMany({
        where: { deckId: id },
        data: { deckId: null },
      });
    }

    // Set deckId = null cho các session liên quan và xóa deck chính
    await this.prisma.$transaction([
      this.prisma.learningSession.updateMany({
        where: { deckId: id },
        data: { deckId: null },
      }),
      this.prisma.deck.delete({ where: { id } }),
    ]);

    // Thống kê user hiện tại giữ nguyên (không thay đổi vì card vẫn tồn tại)
    return {
      success: true,
      message: `Đã xóa deck và gỡ liên kết ${totalDeckCards} card (không xóa dữ liệu học của người dùng).`,
    };
  }

  async getDeckAnalytics(deckId: string, userId: string) {
    const [totalCards, masteredCards] = await Promise.all([
      this.prisma.card.count({ where: { deckId, userId } }),
      this.prisma.card.count({
        where: { deckId, userId, status: CardStatus.MASTERED },
      }),
    ]);

    return {
      totalCards,
      masteredCards,
      progress:
        totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0,
    };
  }

  async createCardManually(
    deckId: string,
    dto: CreateWordDto,
    user: RequestUser,
  ) {
    const where =
      user.role === UserRole.ADMIN
        ? { id: deckId }
        : { id: deckId, creatorId: user.id };
    const deck = await this.prisma.deck.findFirst({ where });
    if (!deck)
      throw new NotFoundException(
        'Bộ thẻ không tồn tại hoặc bạn không có quyền',
      );

    const userId = user.id;
    const wordLower = dto.word.trim().toLowerCase();

    // Kiểm tra user đã có card với từ này chưa (thông qua word)
    const existingCard = await this.prisma.card.findFirst({
      where: {
        userId,
        word: { word: wordLower },
      },
    });
    if (existingCard) {
      throw new ConflictException('Từ này đã có trong kho của bạn');
    }

    // Tìm hoặc tạo word
    let word = await this.prisma.word.findUnique({
      where: { word: wordLower },
    });

    if (!word) {
      word = await this.prisma.word.create({
        data: {
          word: wordLower,
          phonetic: dto.phonetic,
          audioUrl: dto.audioUrl,
          meanings: dto.meanings,
        },
      });
    }

    await this.prisma.ensureUserStatsExist(userId);

    const card = await this.prisma.card.create({
      data: {
        wordId: word.id,
        userId,
        deckId,
        status: CardStatus.NEW,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: new Date(),
      },
      include: { word: true },
    });

    await this.prisma.userStats.update({
      where: { userId },
      data: { totalWords: { increment: 1 } },
    });

    return card;
  }

  async createCardFromWord(
    deckId: string,
    dto: CreateCardWithWordIdDto,
    user: RequestUser,
  ) {
    const where =
      user.role === UserRole.ADMIN
        ? { id: deckId }
        : { id: deckId, creatorId: user.id };
    const deck = await this.prisma.deck.findFirst({ where });
    if (!deck)
      throw new NotFoundException(
        'Bộ thẻ không tồn tại hoặc bạn không có quyền',
      );

    const userId = user.id;

    const word = await this.prisma.word.findUnique({
      where: { id: dto.wordId },
    });
    if (!word) throw new NotFoundException('Từ vựng không tồn tại');

    const existingCard = await this.prisma.card.findFirst({
      where: { userId, wordId: word.id },
    });
    if (existingCard) {
      throw new ConflictException('Bạn đã có thẻ cho từ này rồi');
    }

    await this.prisma.ensureUserStatsExist(userId);

    const card = await this.prisma.card.create({
      data: {
        wordId: word.id,
        userId,
        deckId,
        status: CardStatus.NEW,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: new Date(),
      },
      include: { word: true },
    });

    await this.prisma.userStats.update({
      where: { userId },
      data: { totalWords: { increment: 1 } },
    });

    return card;
  }

  async bulkCreateCardsWithAutoFill(
    deckId: string,
    words: string[],
    user: RequestUser,
  ) {
    const where =
      user.role === UserRole.ADMIN
        ? { id: deckId }
        : { id: deckId, creatorId: user.id };

    const deck = await this.prisma.deck.findFirst({ where });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');

    const userId = user.id; // use stable value; protect against race conditions

    const uniqueInputWords = Array.from(
      new Set(words.map((w) => w.trim().toLowerCase())),
    ).filter(Boolean);

    if (uniqueInputWords.length === 0) {
      return {
        success: true,
        addedCount: 0,
        failedWords: [],
        message: 'Không có từ nào để thêm',
      };
    }

    // Lấy các word đã tồn tại trong kho từ vựng chung
    const existingWordsInGlobal = await this.prisma.word.findMany({
      where: { word: { in: uniqueInputWords } },
      select: { word: true, id: true },
    });
    const existingWordMap = new Map(
      existingWordsInGlobal.map((w) => [w.word, w.id]),
    );

    const wordsToCreate = uniqueInputWords.filter(
      (w) => !existingWordMap.has(w),
    );

    // Tạo word mới
    type LookupResult = {
      word: string;
      data?: Awaited<ReturnType<ManagementService['getMergedData']>>;
      error?: string;
    };

    const lookupResults = await Promise.all(
      wordsToCreate.map(async (word): Promise<LookupResult> => {
        try {
          const data = await this.getMergedData(word);
          return { word, data };
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : 'Unknown error';
          return { word, error: reason };
        }
      }),
    );

    const failedWords = lookupResults
      .filter((item): item is { word: string; error: string } => !!item.error)
      .map((item) => ({ word: item.word, error: item.error }));

    const validNewWords = lookupResults
      .filter(
        (
          item,
        ): item is {
          word: string;
          data: Awaited<ReturnType<ManagementService['getMergedData']>>;
        } => !!item.data,
      )
      .map((item) => item.data);
    const createdWords = await this.prisma.$transaction(
      validNewWords.map((data) =>
        this.prisma.word.create({
          data: {
            word: data.word,
            phonetic: data.phonetic,
            audioUrl: data.audioUrl,
            meanings: data.meanings,
          },
        }),
      ),
    );

    // Tập hợp tất cả wordId cần tạo card
    const allWordIds: string[] = [];
    for (const word of uniqueInputWords) {
      const existingId = existingWordMap.get(word);
      if (existingId) {
        allWordIds.push(existingId);
      } else {
        const newWord = createdWords.find((w) => w.word === word);
        if (newWord) allWordIds.push(newWord.id);
      }
    }

    if (allWordIds.length === 0)
      return { success: true, addedCount: 0, failedWords };

    // Lọc các word mà user chưa có card
    const existingCards = await this.prisma.card.findMany({
      where: {
        userId,
        wordId: { in: allWordIds },
      },
      select: { wordId: true },
    });
    const existingCardWordIds = new Set(existingCards.map((c) => c.wordId));
    const newWordIds = allWordIds.filter((id) => !existingCardWordIds.has(id));

    if (newWordIds.length === 0)
      return {
        success: true,
        addedCount: 0,
        failedWords,
        message: 'Không có từ mới để thêm vào bộ thẻ',
      };

    await this.prisma.ensureUserStatsExist(userId);

    await this.prisma.$transaction([
      this.prisma.card.createMany({
        data: newWordIds.map((wordId) => ({
          wordId,
          userId,
          deckId,
          status: CardStatus.NEW,
          nextReview: new Date(),
          repetitions: 0,
          easeFactor: 2.5,
        })),
      }),
      this.prisma.userStats.update({
        where: { userId },
        data: { totalWords: { increment: newWordIds.length } },
      }),
    ]);

    return { success: true, addedCount: newWordIds.length, failedWords };
  }

  async deleteCard(cardId: string, user: RequestUser) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Thẻ không tồn tại');
    if (user.role !== UserRole.ADMIN && card.userId !== user.id) {
      throw new BadRequestException('Bạn không có quyền xóa thẻ này');
    }

    const userId = card.userId;

    // Đảm bảo UserStats tồn tại trước khi xóa
    await this.prisma.ensureUserStatsExist(userId);

    return this.prisma.$transaction([
      this.prisma.card.delete({ where: { id: cardId } }),
      this.prisma.userStats.update({
        where: { userId },
        data: {
          totalWords: { decrement: 1 },
          learnedWords:
            card.status !== CardStatus.NEW ? { decrement: 1 } : undefined,
          masteredWords:
            card.status === CardStatus.MASTERED ? { decrement: 1 } : undefined,
        },
      }),
    ]);
  }

  private async getMergedData(word: string) {
    const cleanWord = word.trim().toLowerCase(); // Chuẩn hóa ngay từ đầu

    const [viTranslation, publicData] = await Promise.all([
      this.translateToVietnamese(cleanWord),
      this.fetchPublicDictionary(cleanWord),
    ]);

    const meanings: MeaningDto[] = [];

    // Luôn đẩy tiếng Việt vào đầu mảng
    if (viTranslation) {
      meanings.push({
        partOfSpeech: 'Vietnamese',
        definitions: [{ definition: viTranslation }],
      });
      this.logger.info(`[SUCCESS] Dịch từ "${word}": ${viTranslation}`);
    } else {
      this.logger.error(`[FAILED] Không dịch được từ "${word}"`);
    }

    if (publicData?.meanings?.length > 0) {
      const firstMeaning = publicData.meanings[0];
      meanings.push({
        partOfSpeech: firstMeaning.partOfSpeech,
        definitions: firstMeaning.definitions.slice(0, 2).map((d) => ({
          definition: d.definition,
          example: d.example || '',
          synonyms: d.synonyms || [],
          antonyms: d.antonyms || [],
        })),
      });
    }

    if (meanings.length === 0) return null;

    return {
      word: cleanWord, // Đảm bảo luôn lưu chữ thường
      phonetic: publicData?.phonetic || null,
      audioUrl: publicData?.phonetics?.find((p) => p.audio)?.audio || null,
      meanings,
    };
  }

  private async translateToVietnamese(word: string): Promise<string | null> {
    const trimmedWord = word.trim();
    if (!trimmedWord) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const email = this.configService.get<string>('EMAIL_FROM') || 'guest';
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        trimmedWord,
      )}&langpair=en|vi&de=${email}`;

      const res = await fetch(url, { signal: controller.signal });

      // Ép kiểu kết quả trả về từ .json()
      const data = (await res.json()) as IMyMemoryResponse;

      // Kiểm tra status (MyMemory có thể trả về string hoặc number)
      const statusCode = Number.parseInt(String(data.responseStatus), 10);
      if (Number.isNaN(statusCode)) {
        this.logger.error(
          {
            responseStatus: data.responseStatus,
            responseDetails: data.responseDetails,
          },
          'MyMemory API Bad Status Field',
        );
        return null;
      }

      if (statusCode === 429) {
        this.logger.warn({ word: trimmedWord }, 'MyMemory API Rate Limit Hit');
        return null;
      }

      if (statusCode !== 200) {
        this.logger.error(
          {
            status: statusCode,
            originalStatus: data.responseStatus,
            details: data.responseDetails,
          },
          'MyMemory API Error',
        );
        return null;
      }

      const translation = data.responseData?.translatedText;

      // Kiểm tra nếu không có bản dịch hoặc bị trả về chính từ gốc (kết quả rác)
      if (
        !translation ||
        translation.toLowerCase() === trimmedWord.toLowerCase()
      ) {
        return null;
      }

      return translation;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        {
          word: trimmedWord,
          url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            trimmedWord,
          )}&langpair=en|vi&de=${this.configService.get<string>('EMAIL_FROM') || 'guest'}`,
          error: errorMessage,
          stack,
        },
        'Translation failure',
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchPublicDictionary(
    word: string,
  ): Promise<IDictionaryResponse | null> {
    try {
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
      const data = await typedAxiosGet<IDictionaryResponse[]>(url, 5000);
      return data?.[0] || null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.warn(
        {
          word,
          url: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
          error: errorMessage,
          stack,
        },
        'fetchPublicDictionary timeout or error',
      );
      return null;
    }
  }
}
