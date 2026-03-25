// src/modules/vocab/services/management.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CardStatus, Prisma } from '@prisma/client';
import { typedAxiosGet } from '@common/utils/axios-typed';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import {
  MeaningDto,
  CreateDeckDto,
  CreateCardDto,
  UpdateCardDto,
  UpdateDeckDto,
} from '../dto/vocab.dto';

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

  async getDeckWithCards(id: string) {
    return this.prisma.deck.findUnique({
      where: { id },
      include: { cards: true },
    });
  }

  async findPublicDecks(search?: string, tag?: string) {
    return this.prisma.deck.findMany({
      where: {
        isPublic: true,
        AND: [
          search ? { title: { contains: search, mode: 'insensitive' } } : {},
          tag ? { levelTag: tag } : {},
        ],
      },
    });
  }

  async updateDeckStatus(id: string, isPublic: boolean) {
    return this.prisma.deck.update({
      where: { id },
      data: { isPublic },
    });
  }

  async updateDeckMetadata(id: string, dto: UpdateDeckDto, userId: string) {
    const deck = await this.prisma.deck.findFirst({
      where: { id, creatorId: userId },
    });
    if (!deck) throw new NotFoundException('Deck not found');
    return this.prisma.deck.update({ where: { id }, data: dto });
  }

  async updateCard(cardId: string, dto: UpdateCardDto, userId: string) {
    return this.prisma.card.update({
      where: { id: cardId, userId },
      data: {
        ...dto,
        meanings: dto.meanings as unknown as Prisma.MeaningCreateInput[],
      },
    });
  }
  /**
   * CREATE DECK
   * Phải khởi tạo Stats nếu chưa có (phòng hờ)
   */
  async createDeck(creatorId: string, dto: CreateDeckDto) {
    return this.prisma.deck.create({
      data: { ...dto, creatorId },
    });
  }

  /**
   * SOFT DELETE DECK
   * Cập nhật lại totalWords trong UserStats sau khi xóa
   */
  async deleteMasterDeck(id: string, userId: string) {
    const deck = await this.prisma.deck.findFirst({
      where: { id, creatorId: userId },
    });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');

    // Đếm chi tiết từng loại trạng thái trước khi xóa
    const cards = await this.prisma.card.findMany({
      where: { deckId: id, userId },
      select: { status: true },
    });

    const total = cards.length;
    const mastered = cards.filter(
      (c) => c.status === CardStatus.MASTERED,
    ).length;
    const learned = cards.filter((c) => c.status !== CardStatus.NEW).length;

    return this.prisma.$transaction([
      this.prisma.card.deleteMany({ where: { deckId: id, userId } }),
      this.prisma.deck.delete({ where: { id } }),
      this.prisma.userStats.update({
        where: { userId },
        data: {
          totalWords: { decrement: total },
          masteredWords: { decrement: mastered },
          learnedWords: { decrement: learned },
        },
      }),
    ]);
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

  /**
   * CREATE CARD MANUALLY
   */
  async createCardManually(deckId: string, dto: CreateCardDto, userId: string) {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, creatorId: userId },
    });
    if (!deck) throw new NotFoundException('Bộ thẻ không tồn tại');

    const wordLower = dto.word.trim().toLowerCase();

    // 1. Mồi UserStats (ngoài transaction để tránh lock table lâu)
    await this.prisma.userStats.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        totalWords: 0,
        learnedWords: 0,
        masteredWords: 0,
        totalReviews: 0,
      },
    });

    return this.prisma.$transaction(async (tx) => {
      // 2. Check trùng trong Transaction
      const existing = await tx.card.findFirst({
        where: { userId, word: wordLower },
      });
      if (existing)
        throw new BadRequestException('Từ này đã có trong kho của bạn');

      // 3. Tạo Card & Cập nhật Stats đồng thời
      const card = await tx.card.create({
        data: {
          word: wordLower,
          phonetic: dto.phonetic,
          audioUrl: dto.audioUrl,
          meanings: dto.meanings as unknown as Prisma.MeaningCreateInput[],
          userId,
          deckId,
          status: CardStatus.NEW,
          repetitions: 0,
          easeFactor: 2.5,
        },
      });

      await tx.userStats.update({
        where: { userId },
        data: { totalWords: { increment: 1 } },
      });

      return card;
    });
  }

  /**
   * BULK CREATE CARDS
   */
  async bulkCreateCardsWithAutoFill(
    deckId: string,
    words: string[],
    userId: string,
  ) {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, creatorId: userId },
    });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');

    const uniqueInputWords = Array.from(
      new Set(words.map((w) => w.trim().toLowerCase())),
    ).filter(Boolean);

    // Kiểm tra những từ đã có của USER này (tránh trùng lặp global)
    const existingWords = await this.prisma.card.findMany({
      where: { userId, word: { in: uniqueInputWords } },
      select: { word: true },
    });
    const existingSet = new Set(existingWords.map((c) => c.word));
    const wordsToProcess = uniqueInputWords.filter((w) => !existingSet.has(w));

    if (wordsToProcess.length === 0) return { success: true, addedCount: 0 };

    // Xử lý lấy data (giữ nguyên logic fetch của bạn)
    const results = await Promise.all(
      wordsToProcess.map(async (word) => {
        try {
          // Có thể thêm logic check cache từ các card công khai khác ở đây
          return await this.getMergedData(word);
        } catch {
          return null;
        }
      }),
    );

    const validData = results.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    if (validData.length > 0) {
      // 1. Đảm bảo UserStats luôn tồn tại (Chống lỗi record not found)
      // Chúng ta dùng upsert bên ngoài transaction để "mồi" dữ liệu nếu chưa có
      await this.prisma.userStats.upsert({
        where: { userId },
        update: {}, // Không thay đổi gì nếu đã có
        create: {
          userId,
          totalWords: 0,
          learnedWords: 0,
          masteredWords: 0,
          totalReviews: 0,
        },
      });

      // 2. Thực hiện Transaction an toàn
      await this.prisma.$transaction([
        this.prisma.card.createMany({
          data: validData.map((data) => ({
            word: data.word,
            phonetic: data.phonetic ?? '',
            audioUrl: data.audioUrl ?? '',
            meanings: data.meanings as unknown as Prisma.MeaningCreateInput[],
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
          data: { totalWords: { increment: validData.length } },
        }),
      ]);
    }

    return { success: true, addedCount: validData.length };
  }

  /**
   * DELETE CARD
   */
  async deleteCard(cardId: string, userId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) throw new NotFoundException('Thẻ không tồn tại');

    return this.prisma.$transaction([
      this.prisma.card.delete({ where: { id: cardId } }),
      this.prisma.userStats.update({
        where: { userId },
        data: { totalWords: { decrement: 1 } },
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

    try {
      const email = this.configService.get<string>('EMAIL_FROM') || 'guest';
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        trimmedWord,
      )}&langpair=en|vi&de=${email}`;

      const res = await fetch(url);

      // Ép kiểu kết quả trả về từ .json()
      const data = (await res.json()) as IMyMemoryResponse;

      // Kiểm tra status (MyMemory có thể trả về string hoặc number)
      if (Number(data.responseStatus) === 429) {
        this.logger.warn({ word: trimmedWord }, 'MyMemory API Rate Limit Hit');
        return null;
      }

      if (Number(data.responseStatus) !== 200) {
        this.logger.error(
          { status: data.responseStatus, details: data.responseDetails },
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
      this.logger.error(
        { word: trimmedWord, error: errorMessage },
        'Translation failure',
      );
      return null;
    }
  }

  private async fetchPublicDictionary(
    word: string,
  ): Promise<IDictionaryResponse | null> {
    try {
      const data = await typedAxiosGet<IDictionaryResponse[]>(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );
      return data?.[0] || null;
    } catch {
      return null;
    }
  }
}
