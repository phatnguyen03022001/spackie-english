// src/modules/cards/processors/ai-enrichment.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CardsRepository } from '../cards.repository';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { LoggerService } from '@common/logger/logger.service';
import { AiEnrichmentJobData } from '@common/interfaces/job.interface';
import { PUSHER_EVENTS } from '@common/constants/events.constants';
import { Prisma } from '@prisma/client';
import { CardExtras } from '../interfaces/card-enrichment-result.interface';
import { formatBackFromExtras } from '../mappers/card.mapper';

const MEANING_CACHE_TTL = 2592000; // 30 days
const CARD_CACHE_TTL = 86400; // 24h

@Injectable()
@Processor('ai-enrichment')
export class AiEnrichmentProcessor {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly deepSeekClient: DeepSeekClient,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly pusherService: PusherService,
    private readonly logger: LoggerService,
    @InjectQueue('media-enrichment')
    private readonly mediaEnrichmentQueue: Queue,
  ) {
    this.logger.setContext(AiEnrichmentProcessor.name);
  }

  @Process('fetch-meaning')
  async handleFetchMeaning(job: Job<AiEnrichmentJobData>): Promise<void> {
    const { cardId, front, userId, deckId, batchId } = job.data;
    const normalizedFront = front.toLowerCase().trim();

    // 1. Check cache first
    let meaning = await this.cacheManager.get<{
      vi: string;
      examples: string[];
      pronounce: string;
      pos: string;
      synonyms: string;
      antonyms: string;
    }>(`meaning:${normalizedFront}`);

    if (!meaning) {
      try {
        meaning = await this.deepSeekClient.chatShort(normalizedFront);
        await this.cacheManager.set(
          `meaning:${normalizedFront}`,
          meaning,
          MEANING_CACHE_TTL,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `DeepSeek failed for "${normalizedFront}": ${errorMsg}`,
        );
        await this.cardsRepository.updateStatus(cardId, 'failed', errorMsg);
        await this.pusherService.triggerToUser(
          userId,
          PUSHER_EVENTS.CARD_MEANING_FAILED,
          { cardId, front, error: errorMsg },
        );
        return;
      }
    }

    // 2. Store meaning data in extras (structured JSON) and compute back field
    const extras: Record<string, unknown> = {
      meaningReady: true,
      pronounce: meaning.pronounce || undefined,
      pos: meaning.pos || undefined,
      vi: meaning.vi || undefined,
      examples: meaning.examples?.length > 0 ? meaning.examples : undefined,
      synonyms: meaning.synonyms || undefined,
      antonyms: meaning.antonyms || undefined,
    };

    // Compute back from extras for performance (no per-request formatting needed)
    const back = formatBackFromExtras(extras as unknown as CardExtras);

    const updatedCard = await this.cardsRepository.updateGlobalCard(cardId, {
      back,
      status: 'meaning_ready',
      extras: extras as Prisma.InputJsonValue,
    });

    // 4. Update cache
    await this.cacheManager.set(
      `card:front:${normalizedFront}`,
      updatedCard,
      CARD_CACHE_TTL,
    );

    // 5. Notify client via Pusher
    try {
      await this.pusherService.triggerToUser(
        userId,
        PUSHER_EVENTS.CARD_MEANING_READY,
        {
          cardId,
          front,
          extras,
        },
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Pusher failed for meaning ready ${front}: ${errorMsg}`);
    }

    // 5b. Update batch progress and emit batch.progress event
    if (batchId) {
      try {
        const batchResult = await this.cacheManager.get<{
          batchId: string;
          status: string;
          progress: { total: number; completed: number; failed: number };
          items: Array<{
            front: string;
            status: string;
            cardId: string | null;
          }>;
        }>(`batch:${batchId}`);

        if (batchResult) {
          batchResult.progress.completed += 1;
          // Update item status
          const item = batchResult.items.find(
            (i) => i.front === normalizedFront,
          );
          if (item) {
            item.status = 'completed';
            item.cardId = cardId;
          }
          // Check if all done
          if (batchResult.progress.completed >= batchResult.progress.total) {
            batchResult.status = 'completed';
          }
          await this.cacheManager.set(`batch:${batchId}`, batchResult, 604800);

          // Emit batch.progress via Pusher
          await this.pusherService.triggerToUser(
            userId,
            PUSHER_EVENTS.BATCH_PROGRESS,
            {
              batchId,
              progress: batchResult.progress,
              status: batchResult.status,
              lastCompleted: front,
            },
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Batch progress update failed: ${errorMsg}`);
      }
    }

    // 6. Enqueue media enrichment (image + audio) if needed
    await this.mediaEnrichmentQueue.add(
      'enrich-media',
      {
        cardId,
        front,
        normalizedFront,
        userId,
        deckId,
        batchId,
      },
      {
        jobId: `media:${normalizedFront}:${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        timeout: 60000,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.log(
      `Meaning resolved for "${normalizedFront}" (status: meaning_ready)`,
    );
  }
}
