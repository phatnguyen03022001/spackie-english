// src/modules/cards/use-cases/create-card-auto.use-case.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CardsRepository } from '../cards.repository';
import { DecksRepository } from '@modules/decks/decks.repository';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { CardMapper } from '../mappers/card.mapper';
import { CardResponseDto } from '../dto/card-response.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GlobalCard } from '@prisma/client';
import { AiEnrichmentJobData } from '@common/interfaces/job.interface';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';
import { ERROR_CODES } from '@common/constants/error-codes.const';

const CARD_CACHE_TTL = 86400; // 24h

@Injectable()
export class CreateCardAutoUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly decksRepository: DecksRepository,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
    private readonly mapper: CardMapper,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('ai-enrichment')
    private readonly aiEnrichmentQueue: Queue<AiEnrichmentJobData>,
    private readonly wordValidator: WordValidatorClient,
  ) {
    this.logger.setContext(CreateCardAutoUseCase.name);
  }

  async execute(
    userId: string,
    deckId: string,
    front: string,
    idempotencyKey?: string,
  ): Promise<CardResponseDto> {
    // 1. Idempotency: nếu có key, kiểm tra cache để tránh tạo trùng khi retry
    if (idempotencyKey) {
      const cached = await this.cacheManager.get<CardResponseDto>(
        `idempotent:card:${idempotencyKey}`,
      );
      if (cached) return cached;
    }

    // 2. Kiểm tra quyền sở hữu deck
    const deck = await this.decksRepository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // 3. Chuẩn hóa front text (trim, lowercase)
    const normalizedFront = front.trim().toLowerCase();

    // 4. Validate front text before creating card
    const validationResult =
      await this.wordValidator.validateWord(normalizedFront);
    if (!validationResult.isValid) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.INVALID_WORD,
        `'${normalizedFront}' is not recognized as a valid English word or phrase.`,
        {
          suggestion: validationResult.correction || undefined,
          reason: validationResult.reason || undefined,
        },
      );
    }

    // 5. Kiểm tra cache → DB
    const cacheKey = `card:front:${normalizedFront}`;
    let globalCard = await this.cacheManager.get<GlobalCard>(cacheKey);
    if (!globalCard) {
      globalCard =
        await this.cardsRepository.findGlobalCardByFront(normalizedFront);
      if (globalCard) {
        await this.cacheManager.set(cacheKey, globalCard, CARD_CACHE_TTL);
      }
    }

    // 6. Nếu đã tồn tại → tạo mapping (nếu chưa có)
    if (globalCard) {
      if (!(await this.cardsRepository.mappingExists(deckId, globalCard.id))) {
        await this.cardsRepository.createMapping({
          deck: { connect: { id: deckId } },
          globalCard: { connect: { id: globalCard.id } },
        });
        await this.decksRepository.incrementTotalCards(deckId, 1);
        await this.invalidateCache(deckId, userId);
        this.eventEmitter.emit('card.created', {
          cardId: globalCard.id,
          deckId,
          userId,
        });
      }
      return this.mapper.toResponseDto(globalCard);
    }

    // 7. Tạo GlobalCard với status = pending, back = null (chưa có nghĩa)
    this.logger.log(
      `Creating card "${normalizedFront}" with status=pending (async AI enrichment)`,
    );
    const newCard = await this.cardsRepository.createGlobalCard({
      front: normalizedFront,
      back: null,
      imageUrl: null,
      audioUrl: null,
      extras: {},
      status: 'pending',
      validated: true,
      valid: true,
    });

    // 8. Tạo mapping + increment totalCards ngay
    await this.cardsRepository.createMapping({
      deck: { connect: { id: deckId } },
      globalCard: { connect: { id: newCard.id } },
    });
    await this.decksRepository.incrementTotalCards(deckId, 1);

    // 9. Cache (warm-up)
    await this.cacheManager.set(cacheKey, newCard, CARD_CACHE_TTL);

    // 10. Enqueue AI job để resolve meaning (async)
    await this.aiEnrichmentQueue.add(
      'fetch-meaning',
      {
        cardId: newCard.id,
        front: normalizedFront,
        userId,
        deckId,
      },
      {
        jobId: `ai:${normalizedFront}:${Date.now()}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        timeout: 15000,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    // 11. Cache idempotency response
    if (idempotencyKey) {
      await this.cacheManager.set(
        `idempotent:card:${idempotencyKey}`,
        this.mapper.toResponseDto(newCard),
        CARD_CACHE_TTL,
      );
    }

    // 12. Invalidate cache & emit event
    await this.invalidateCache(deckId, userId);
    this.eventEmitter.emit('card.created', {
      cardId: newCard.id,
      deckId,
      userId,
    });

    this.logger.log(
      `Card "${normalizedFront}" created (pending). AI job enqueued.`,
    );

    return this.mapper.toResponseDto(newCard);
  }

  private async invalidateCache(deckId: string, userId: string): Promise<void> {
    await this.cacheManager.delPattern(`cards:deck:${deckId}:*`);
    await this.cacheManager.delPattern(`decks:own:list:*:userId:${userId}:*`);
  }
}
