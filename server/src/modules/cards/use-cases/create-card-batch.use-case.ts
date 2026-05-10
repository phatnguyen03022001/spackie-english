// src/modules/cards/use-cases/create-card-batch.use-case.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { randomUUID } from 'crypto';
import { CardsRepository } from '../cards.repository';
import { DecksRepository } from '@modules/decks/decks.repository';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { LoggerService } from '@common/logger/logger.service';
import { CreateCardBatchDto } from '../dto/create-card-batch.dto';
import {
  AiEnrichmentJobData,
  BatchJobResult,
} from '@common/interfaces/job.interface';
import { normalizeFront, dedupeFronts } from '../utils/card-media.util';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';
import { ERROR_CODES } from '@common/constants/error-codes.const';

const BATCH_IDEMPOTENCY_TTL = 86400; // 24h
const BATCH_CACHE_TTL = 7 * 86400; // 7 days

@Injectable()
export class CreateCardBatchUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly decksRepository: DecksRepository,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    @InjectQueue('ai-enrichment')
    private readonly aiEnrichmentQueue: Queue<AiEnrichmentJobData>,
    private readonly logger: LoggerService,
    private readonly wordValidator: WordValidatorClient,
  ) {
    this.logger.setContext(CreateCardBatchUseCase.name);
  }

  async execute(
    userId: string,
    deckId: string,
    dto: CreateCardBatchDto,
  ): Promise<{
    batchId: string;
    jobIds: string[];
    invalidWords?: Array<{
      front: string;
      reason?: string;
      suggestion?: string;
    }>;
  }> {
    // 1. Idempotency
    if (dto.idempotencyKey) {
      const cached = await this.cacheManager.get<{
        batchId: string;
        jobIds: string[];
      }>(`idempotent:batch:${dto.idempotencyKey}`);
      if (cached) return cached;
    }

    // 2. Check deck ownership
    const deck = await this.decksRepository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // 3. Normalize and dedupe fronts
    const normalizedFronts = dto.fronts.map((f) => normalizeFront(f));
    const uniqueFronts = dedupeFronts(normalizedFronts);

    // 4. Validate all fronts before creating any cards
    const invalidWords: Array<{
      front: string;
      reason?: string;
      suggestion?: string;
    }> = [];
    const validFronts: string[] = [];

    for (const front of uniqueFronts) {
      const validationResult = await this.wordValidator.validateWord(front);
      if (!validationResult.isValid) {
        invalidWords.push({
          front,
          reason: validationResult.reason,
          suggestion: validationResult.correction,
        });
      } else {
        validFronts.push(front);
      }
    }

    // If there are invalid words, reject the whole batch with details
    if (invalidWords.length > 0) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.INVALID_WORD,
        `Some words are not recognized as valid English words or phrases.`,
        {
          invalidWords,
          message:
            invalidWords.length === uniqueFronts.length
              ? 'All provided words are invalid.'
              : `${invalidWords.length} of ${uniqueFronts.length} words are invalid. Only valid words will be processed.`,
        },
      );
    }

    // 5. Find existing GlobalCards
    const existingCardsMap =
      await this.cardsRepository.findGlobalCardsByFronts(validFronts);
    const existingFronts = new Set(existingCardsMap.keys());
    const newFronts = validFronts.filter((f) => !existingFronts.has(f));

    // 6. Create new GlobalCards (placeholders with status=pending, validated=true)
    const newCards: Array<{ front: string; id: string }> = [];
    for (const front of newFronts) {
      const card = await this.cardsRepository.createGlobalCard({
        front,
        back: null,
        extras: {},
        status: 'pending',
        validated: true,
        valid: true,
      });
      newCards.push({ front, id: card.id });
      // Warm cache
      await this.cacheManager.set(`card:front:${front}`, card, 86400);
    }

    // 7. Collect all card IDs for mapping
    const allCardIds: string[] = [];
    for (const front of validFronts) {
      if (existingCardsMap.has(front)) {
        allCardIds.push(existingCardsMap.get(front)!.id);
      } else {
        const newCard = newCards.find((c) => c.front === front);
        if (newCard) allCardIds.push(newCard.id);
      }
    }

    // 8. Create mappings in batch
    await this.cardsRepository.createMappingsBatch(deckId, allCardIds);

    // 9. Update totalCards count
    await this.decksRepository.incrementTotalCards(deckId, allCardIds.length);

    // 10. Enqueue AI enrichment jobs for new cards only (async)
    const batchId = randomUUID();
    const jobIds: string[] = [];

    for (const card of newCards) {
      const job = await this.aiEnrichmentQueue.add(
        'fetch-meaning',
        {
          cardId: card.id,
          front: card.front,
          userId,
          deckId,
          batchId,
        },
        {
          jobId: `ai:${card.front}:${Date.now()}`,
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          timeout: 15000,
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
      jobIds.push(job.id.toString());
    }

    // 11. Initialize batch progress cache
    const batchResult: BatchJobResult = {
      batchId,
      status: jobIds.length > 0 ? 'processing' : 'completed',
      progress: {
        total: validFronts.length,
        completed: existingFronts.size,
        failed: 0,
      },
      items: validFronts.map((front) => ({
        front,
        status: existingFronts.has(front) ? 'completed' : 'pending',
        cardId: existingCardsMap.get(front)?.id ?? null,
      })),
    };
    await this.cacheManager.set(
      `batch:${batchId}`,
      batchResult,
      BATCH_CACHE_TTL,
    );

    // 12. Cache idempotency response
    const response = { batchId, jobIds };
    if (dto.idempotencyKey) {
      await this.cacheManager.set(
        `idempotent:batch:${dto.idempotencyKey}`,
        response,
        BATCH_IDEMPOTENCY_TTL,
      );
    }

    // 13. Invalidate deck list cache
    await this.invalidateDeckCache(deckId, userId);

    this.logger.log(
      `Batch created: ${validFronts.length} cards (${existingFronts.size} existing, ${newCards.length} new) - AI jobs enqueued`,
    );

    return response;
  }

  private async invalidateDeckCache(
    deckId: string,
    userId: string,
  ): Promise<void> {
    await this.cacheManager.delPattern(`cards:deck:${deckId}:*`);
    await this.cacheManager.delPattern(`decks:own:list:*:userId:${userId}:*`);
  }
}
