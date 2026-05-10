// src/modules/cards/cards.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { CardsRepository } from './cards.repository';
import { CardMapper, formatBackFromExtras } from './mappers/card.mapper';
import { CardResponseDto } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardListQueryDto } from './dto/card-list-query.dto';
import { DecksRepository } from '@modules/decks/decks.repository';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { LoggerService } from '@common/logger/logger.service';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { CardExtras } from './interfaces/card-enrichment-result.interface';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class CardsService {
  private readonly domain = 'cards';

  constructor(
    private readonly repository: CardsRepository,
    private readonly mapper: CardMapper,
    private readonly decksRepository: DecksRepository,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly eventEmitter: EventEmitter2,
    private readonly deepSeekClient: DeepSeekClient,
    private readonly ttsClient: GoogleTtsClient,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService,
    private readonly wordValidator: WordValidatorClient,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(CardsService.name);
  }

  // ------------------- Tạo card manual -------------------
  async createCardManual(
    userId: string,
    deckId: string,
    dto: CreateCardDto,
  ): Promise<CardResponseDto> {
    // 1. Kiểm tra quyền sở hữu deck
    const deck = await this.decksRepository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // 1b. Validate front text
    const validationResult = await this.wordValidator.validateWord(dto.front);
    if (!validationResult.isValid) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.INVALID_WORD,
        `'${dto.front}' is not recognized as a valid English word or phrase.`,
        {
          suggestion: validationResult.correction || undefined,
          reason: validationResult.reason || undefined,
        },
      );
    }

    // 2. Tìm hoặc tạo GlobalCard
    let globalCard = await this.repository.findGlobalCardByFront(dto.front);
    if (!globalCard) {
      globalCard = await this.repository.createGlobalCard({
        front: dto.front,
        back: dto.back || '',
        extras: {},
        status: 'completed',
        validated: true,
        valid: true,
      });
    }

    // 3. Kiểm tra mapping đã tồn tại chưa
    const exists = await this.repository.mappingExists(deckId, globalCard.id);
    if (exists) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'CARD_ALREADY_IN_DECK',
        'Card already in this deck',
      );
    }

    // 4. Tạo mapping
    await this.repository.createMapping({
      deck: { connect: { id: deckId } },
      globalCard: { connect: { id: globalCard.id } },
    });

    // 5. Cập nhật totalCards
    await this.decksRepository.incrementTotalCards(deckId, 1);

    // 6. Invalidate caches
    await this.invalidateDeckCache(deckId, userId);
    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'global', globalCard.id),
    );

    // 7. Emit event
    this.eventEmitter.emit('card.created', {
      cardId: globalCard.id,
      deckId,
      userId,
    });

    return this.mapper.toResponseDto(globalCard);
  }

  // ------------------- Update GlobalCard -------------------
  async updateGlobalCard(
    userId: string,
    cardId: string,
    dto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    // 1. Kiểm tra card tồn tại
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    // 2. Kiểm tra quyền: user phải sở hữu ít nhất 1 deck có chứa card này
    const mappingCount =
      await this.repository.countMappingsByGlobalCard(cardId);
    if (mappingCount === 0) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'CARD_NOT_IN_ANY_DECK',
        'Card is not associated with any deck',
      );
    }

    // 3. Xây dựng update data
    const updateData: Record<string, unknown> = {};
    if (dto.front !== undefined) updateData.front = dto.front;
    if (dto.back !== undefined) updateData.back = dto.back;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.audioUrl !== undefined) updateData.audioUrl = dto.audioUrl;

    // Nếu user cập nhật back (nghĩa), set status = completed
    if (dto.back !== undefined) {
      updateData.status = 'completed';
    }

    // Nếu extras được cập nhật, recompute back field
    if (dto.extras) {
      const newExtras = {
        ...(card.extras as Record<string, unknown>),
        ...dto.extras,
      };
      updateData.extras = newExtras;
      updateData.back = formatBackFromExtras(
        newExtras as unknown as CardExtras,
      );
    }

    // 4. Invalidate cache liên quan đến front cũ nếu front/back thay đổi
    if (dto.front !== undefined && dto.front !== card.front) {
      // Xoá cache meaning, audio, card:front của front cũ
      await this.cacheManager.del(`meaning:${card.front}`);
      await this.cacheManager.del(`audio:${card.front}`);
      await this.cacheManager.del(`card:front:${card.front}`);
    }
    if (dto.back !== undefined && dto.back !== card.back) {
      // Nghĩa cũ không còn đúng → xoá cache meaning
      await this.cacheManager.del(`meaning:${card.front}`);
    }

    // 5. Update DB
    const updated = await this.repository.updateGlobalCard(cardId, updateData);

    // 6. Cache lại card với front mới (nếu front thay đổi)
    if (dto.front !== undefined && dto.front !== card.front) {
      await this.cacheManager.set(
        `card:front:${updated.front}`,
        updated,
        86400,
      );
    }

    // 7. Invalidate cache chung
    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'global', cardId),
    );

    // 8. Emit event
    this.eventEmitter.emit('card.updated', {
      cardId,
      userId,
    });

    return this.mapper.toResponseDto(updated);
  }

  // ------------------- List cards trong deck -------------------
  async findCardsByDeck(
    userId: string,
    deckId: string,
    query: CardListQueryDto,
  ): Promise<{ data: CardResponseDto[]; total: number }> {
    // Kiểm tra quyền xem deck
    const deck = await this.decksRepository.findById(deckId);
    if (!deck) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DECK_NOT_FOUND',
        'Deck not found',
      );
    }
    if (deck.visibility === 'PRIVATE' && deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_PRIVATE',
        'Deck is private',
      );
    }

    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      `deck:${deckId}`,
      query.page,
      query.limit,
      { search: query.search || '', userId },
    );
    const cached = await this.cacheManager.get<{
      data: CardResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const { mappings, total } = await this.repository.findMappingsByDeck(
      deckId,
      query.page,
      query.limit,
      query.search,
    );
    const data = mappings.map((m) => this.mapper.toResponseDto(m.globalCard));
    const result = { data, total };
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.LIST);
    return result;
  }

  // ------------------- Chi tiết GlobalCard -------------------
  async findGlobalCardById(id: string): Promise<CardResponseDto> {
    const cacheKey = CacheKeyBuilder.resource(this.domain, 'global', id);
    const cached = await this.cacheManager.get<CardResponseDto>(cacheKey);
    if (cached) return cached;

    const card = await this.repository.findGlobalCardById(id);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }
    const dto = this.mapper.toResponseDto(card);
    await this.cacheManager.set(cacheKey, dto, CACHE_TTL.MEDIUM);
    return dto;
  }

  // ------------------- Xoá mapping (xóa card khỏi deck) -------------------
  async deleteCardFromDeck(
    userId: string,
    deckId: string,
    globalCardId: string,
  ): Promise<void> {
    const deck = await this.decksRepository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }
    await this.repository.deleteMapping(deckId, globalCardId);
    await this.decksRepository.incrementTotalCards(deckId, -1);
    await this.invalidateDeckCache(deckId, userId);
    this.eventEmitter.emit('card.deleted', {
      cardId: globalCardId,
      deckId,
      userId,
    });
  }

  // ------------------- Upload image cho GlobalCard -------------------
  async uploadImage(
    userId: string,
    cardId: string,
    fileBuffer: Buffer,
    fileName: string,
    _mimeType: string,
  ): Promise<CardResponseDto> {
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    // Upload to storage with consistent publicId
    const timestamp = Date.now();
    const publicId = `cards/images/${cardId}_${timestamp}`;
    const uploadResult = await this.storageService.upload(
      fileBuffer,
      fileName,
      {
        folder: 'cards/images',
        publicId,
      },
    );

    // Update GlobalCard
    const updated = await this.repository.updateGlobalCard(cardId, {
      imageUrl: uploadResult.url,
    });

    // Create File record for ownership tracking and quota
    await this.prisma.file
      .create({
        data: {
          userId,
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          resourceType: 'image',
          mimeType: _mimeType,
          sizeBytes: fileBuffer.length,
          refType: 'CARD_IMAGE',
          refId: cardId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to create File record for card image: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'global', cardId),
    );
    this.eventEmitter.emit('card.updated', { cardId, userId });

    return this.mapper.toResponseDto(updated);
  }

  // ------------------- Delete image của GlobalCard -------------------
  async deleteImage(userId: string, cardId: string): Promise<CardResponseDto> {
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    const updated = await this.repository.updateGlobalCard(cardId, {
      imageUrl: null,
    });

    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'global', cardId),
    );
    this.eventEmitter.emit('card.updated', { cardId, userId });

    return this.mapper.toResponseDto(updated);
  }

  // ------------------- Upload audio cho GlobalCard -------------------
  async uploadAudio(
    userId: string,
    cardId: string,
    fileBuffer: Buffer,
    fileName: string,
    _mimeType: string,
  ): Promise<CardResponseDto> {
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    // Upload to storage with consistent publicId
    const timestamp = Date.now();
    const publicId = `cards/audio/${cardId}_${timestamp}`;
    const uploadResult = await this.storageService.upload(
      fileBuffer,
      fileName,
      {
        folder: 'cards/audio',
        publicId,
      },
    );

    const updated = await this.repository.updateGlobalCard(cardId, {
      audioUrl: uploadResult.url,
    });

    // Create File record for ownership tracking and quota
    await this.prisma.file
      .create({
        data: {
          userId,
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          resourceType: 'audio',
          mimeType: _mimeType,
          sizeBytes: fileBuffer.length,
          refType: 'CARD_AUDIO',
          refId: cardId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to create File record for card audio: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'global', cardId),
    );
    this.eventEmitter.emit('card.updated', { cardId, userId });

    return this.mapper.toResponseDto(updated);
  }

  // ------------------- Delete audio của GlobalCard -------------------
  async deleteAudio(userId: string, cardId: string): Promise<CardResponseDto> {
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    const updated = await this.repository.updateGlobalCard(cardId, {
      audioUrl: null,
    });

    await this.cacheManager.del(
      CacheKeyBuilder.resource(this.domain, 'global', cardId),
    );
    this.eventEmitter.emit('card.updated', { cardId, userId });

    return this.mapper.toResponseDto(updated);
  }

  // ------------------- Generate Audio (lazy load) -------------------
  async generateAudio(
    userId: string,
    cardId: string,
  ): Promise<CardResponseDto> {
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    // Nếu đã có audio, trả về luôn
    if (card.audioUrl) {
      return this.mapper.toResponseDto(card);
    }

    // Cache audio theo front để tránh tạo lại cho cùng từ
    const audioCacheKey = `audio:${card.front}`;
    const cachedAudioUrl = await this.cacheManager.get<string>(audioCacheKey);
    if (cachedAudioUrl) {
      const updated = await this.repository.updateGlobalCard(cardId, {
        audioUrl: cachedAudioUrl,
      });
      await this.cacheManager.del(
        CacheKeyBuilder.resource(this.domain, 'global', cardId),
      );
      return this.mapper.toResponseDto(updated);
    }

    // Tạo audio mới (dùng GoogleTtsClient đã inject)
    try {
      const audioBuffer = await this.ttsClient.synthesize(card.front);

      if (audioBuffer) {
        const uploadResult = await this.storageService.upload(
          audioBuffer,
          `${card.front}.mp3`,
          { folder: 'cards/audio' },
        );

        const updated = await this.repository.updateGlobalCard(cardId, {
          audioUrl: uploadResult.url,
        });

        // Cache audio URL
        await this.cacheManager.set(
          audioCacheKey,
          uploadResult.url,
          30 * 86400,
        );

        await this.cacheManager.del(
          CacheKeyBuilder.resource(this.domain, 'global', cardId),
        );
        this.eventEmitter.emit('card.updated', { cardId, userId });

        return this.mapper.toResponseDto(updated);
      }
    } catch (err) {
      this.logger.warn(
        `Audio generation failed for card ${cardId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return this.mapper.toResponseDto(card);
  }

  // ------------------- AI Hint (sinh gợi ý từ DeepSeek) -------------------
  async generateAiHint(cardId: string): Promise<{ hint: string }> {
    const card = await this.repository.findGlobalCardById(cardId);
    if (!card) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'CARD_NOT_FOUND',
        'Card not found',
      );
    }

    try {
      const aiResponse = await this.deepSeekClient.chat([
        {
          role: 'system',
          content:
            'You are a helpful English tutor. Provide a short hint, mnemonic, or example sentence to help remember this word. Keep it under 100 words.',
        },
        {
          role: 'user',
          content: `Word: "${card.front}"\nMeaning: "${card.back}"\n\nGive me a memorization hint:`,
        },
      ]);
      return { hint: aiResponse };
    } catch (error) {
      this.logger.warn(
        `DeepSeek AI hint failed for card ${cardId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        hint: `Try to remember "${card.front}" by associating it with something familiar.`,
      };
    }
  }

  // Helper cache
  private async invalidateDeckCache(
    deckId: string,
    userId: string,
  ): Promise<void> {
    const pattern = CacheKeyBuilder.listPattern(this.domain, `deck:${deckId}`);
    await this.cacheManager.delPattern(pattern);
    // Xoá thêm cache list của user (nếu có)
    await this.cacheManager.delPattern(`decks:own:list:*:userId:${userId}:*`);
  }
}
