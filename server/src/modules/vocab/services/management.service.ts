import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { typedAxiosGet } from '@common/utils/axios-typed';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { translate } from '@vitalets/google-translate-api';
import { MeaningDto, CreateDeckDto, CreateCardDto } from '../dto/vocab.dto';

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

  private async translateToVietnamese(word: string): Promise<string | null> {
    try {
      const res = await translate(word, { to: 'vi' });
      return res.text;
    } catch (error: unknown) {
      this.logger.error({ word, error }, 'Google Translate Error');
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

  private async getMergedData(word: string) {
    const publicData = await this.fetchPublicDictionary(word);
    if (!publicData) return null;

    const viTranslation = await this.translateToVietnamese(word);
    const meanings: MeaningDto[] = [];

    if (viTranslation) {
      meanings.push({
        partOfSpeech: 'Vietnamese',
        definitions: [
          { definition: viTranslation, synonyms: [], antonyms: [] },
        ],
      });
    }

    if (publicData.meanings?.length > 0) {
      const firstMeaning = publicData.meanings[0];
      meanings.push({
        partOfSpeech: firstMeaning.partOfSpeech,
        definitions: firstMeaning.definitions.slice(0, 2).map((d) => ({
          definition: d.definition,
          example: d.example || undefined, // Chuyển null thành undefined để khớp DTO
          synonyms: d.synonyms || [],
          antonyms: d.antonyms || [],
        })),
      });
    }

    return {
      word: publicData.word.toLowerCase(),
      phonetic:
        publicData.phonetic ||
        publicData.phonetics.find((p) => p.text)?.text ||
        null,
      audioUrl: publicData.phonetics.find((p) => p.audio)?.audio || null,
      meanings,
    };
  }

  async bulkCreateCardsWithAutoFill(deckId: string, words: string[]) {
    if (!words?.length) throw new BadRequestException('Danh sách trống');

    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: { creatorId: true, cards: { select: { word: true } } },
    });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');

    const uniqueWords = Array.from(
      new Set(words.map((w) => w.trim().toLowerCase())),
    ).filter(Boolean);

    const [existingUserCards, globalExistingCards] = await Promise.all([
      this.prisma.card.findMany({
        where: { userId: deck.creatorId, word: { in: uniqueWords } },
      }),
      this.prisma.card.findMany({
        where: { word: { in: uniqueWords } },
        distinct: ['word'],
      }),
    ]);

    const userCardsMap = new Map(existingUserCards.map((c) => [c.word, c]));
    const globalCardsMap = new Map(globalExistingCards.map((c) => [c.word, c]));

    const results = await Promise.all(
      uniqueWords.map(async (word) => {
        try {
          if (userCardsMap.has(word)) return null;

          const existingGlobal = globalCardsMap.get(word);
          if (existingGlobal) {
            return {
              word: existingGlobal.word,
              phonetic: existingGlobal.phonetic,
              audioUrl: existingGlobal.audioUrl,
              // Ép kiểu về interface nội bộ để xử lý trung gian
              meanings: existingGlobal.meanings as unknown as MeaningDto[],
            };
          }

          return await this.getMergedData(word);
        } catch (error: unknown) {
          // FIX: Ép kiểu error về unknown và xử lý để tránh 'any' unsafe assignment
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            { word, error: errorMessage },
            'Error processing card',
          );
          return null;
        }
      }),
    );

    const validData = results.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    if (validData.length === 0) {
      return {
        success: true,
        addedCount: 0,
        message: 'Tất cả từ vựng đã tồn tại hoặc không hợp lệ',
      };
    }

    try {
      const createdItems = await this.prisma.$transaction(
        validData.map((data) =>
          this.prisma.card.create({
            data: {
              word: data.word,
              phonetic: data.phonetic,
              audioUrl: data.audioUrl,
              /**
               * FIX TS2322 & ESLint Unsafe Assignment:
               * Sử dụng Prisma.MeaningCreateInput[] thay vì any.
               * Cách này vừa làm Prisma hài lòng, vừa làm ESLint hài lòng.
               */
              meanings: data.meanings as Prisma.MeaningCreateInput[],
              user: { connect: { id: deck.creatorId } },
              deck: { connect: { id: deckId } },
            },
          }),
        ),
      );

      return {
        success: true,
        addedCount: createdItems.length,
        skippedCount: uniqueWords.length - createdItems.length,
      };
    } catch (err: unknown) {
      const finalError =
        err instanceof Error ? err.message : 'Database transaction failed';
      this.logger.error({ error: finalError });
      throw new BadRequestException('Lỗi hệ thống khi lưu thẻ vựng.');
    }
  }
  // --- Các hàm quản lý Deck ---
  async createDeck(creatorId: string, dto: CreateDeckDto) {
    return this.prisma.deck.create({ data: { ...dto, creatorId } });
  }

  async softDeleteDeck(id: string) {
    return this.prisma.$transaction([
      this.prisma.card.deleteMany({ where: { deckId: id } }),
      this.prisma.deck.delete({ where: { id } }),
    ]);
  }

  async findTeacherDecks(teacherId: string) {
    return this.prisma.deck.findMany({
      where: { creatorId: teacherId },
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: 'desc' },
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
      include: {
        _count: { select: { cards: true } },
        creator: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  // Thêm vào ManagementService
  async getDeckWithCards(id: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id },
      include: {
        cards: {
          select: {
            word: true,
            phonetic: true,
            audioUrl: true,
            meanings: true,
          },
        },
        creator: { select: { name: true } },
      },
    });

    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');
    return deck;
  }

  async updateDeckStatus(id: string, isPublic: boolean) {
    return this.prisma.deck.update({
      where: { id },
      data: { isPublic, updatedAt: new Date() },
    });
  }

  async updateCard(cardId: string, dto: CreateCardDto) {
    // Kiểm tra card tồn tại
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Không tìm thấy thẻ từ vựng');

    return this.prisma.card.update({
      where: { id: cardId },
      data: {
        word: dto.word.toLowerCase(),
        phonetic: dto.phonetic,
        audioUrl: dto.audioUrl,
        // Ép kiểu chính xác để Prisma MongoDB chấp nhận Composite Type
        meanings: dto.meanings as Prisma.MeaningCreateInput[],
        updatedAt: new Date(),
      },
    });
  }

  async deleteCard(cardId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Không tìm thấy thẻ từ vựng');

    return this.prisma.card.delete({ where: { id: cardId } });
  }
}
