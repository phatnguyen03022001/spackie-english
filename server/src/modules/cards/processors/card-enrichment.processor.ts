// src/modules/cards/processors/card-enrichment.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { CardsRepository } from '../cards.repository';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { RedisLockService } from '@infrastructure/redis/redis-lock.service';
import {
  EnrichmentJobData,
  BatchJobResult,
} from '@common/interfaces/job.interface';
import { extractKeywordForImage } from '../utils/card-media.util';

const CARD_CACHE_TTL = 86400; // 24h
const MEANING_CACHE_TTL = 2592000; // 30 days
const IMAGE_CACHE_TTL = 2592000; // 30 days
const AUDIO_CACHE_TTL = 2592000; // 30 days
const FETCH_TIMEOUT_MS = 5000; // 5s

@Injectable()
@Processor('card-enrichment')
export class CardEnrichmentProcessor {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly deepSeekClient: DeepSeekClient,
    private readonly pixabayClient: PixabayClient,
    private readonly ttsClient: GoogleTtsClient,
    private readonly storageService: StorageService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly lockService: RedisLockService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pusherService: PusherService,
  ) {
    this.logger.setContext(CardEnrichmentProcessor.name);
  }

  @Process('enrich')
  async handle(job: Job<EnrichmentJobData>): Promise<void> {
    const { cardId, front, normalizedFront, userId, deckId, batchId } =
      job.data;
    const lockKey = `lock:card:${normalizedFront}`;

    await this.lockService.withLock(lockKey, 30, async () => {
      // Double-check after lock
      let card = await this.cardsRepository.findGlobalCardById(cardId);
      if (!card) {
        this.logger.warn(`Card ${cardId} not found, aborting enrichment`);
        return;
      }

      // If already enriched (has meaning), skip
      if (card.back && card.back !== 'Processing...') {
        await this.updateJobStatus(job, 'completed', cardId, batchId);
        return;
      }

      // Step 1: Get meaning (from cache or DeepSeek)
      const meaning = await this.resolveMeaning(normalizedFront);
      const backContent = meaning.examples?.length
        ? `${meaning.vi}\n\nVí dụ: ${meaning.examples[0]}`
        : meaning.vi;

      // Step 2: Update card with meaning
      card = await this.cardsRepository.updateGlobalCard(cardId, {
        back: backContent,
        extras: { meaningReady: true },
      });

      // Step 3: Update cache
      await this.cacheManager.set(
        `card:front:${normalizedFront}`,
        card,
        CARD_CACHE_TTL,
      );

      // Step 4: Optional image + audio (parallel, non-blocking)
      const keyword = extractKeywordForImage(front);
      const [imageUrlResult, audioUrlResult] = await Promise.allSettled([
        this.resolveImage(normalizedFront, keyword),
        this.resolveAudio(normalizedFront),
      ]);

      const imageUrl =
        imageUrlResult.status === 'fulfilled'
          ? imageUrlResult.value
          : undefined;
      const audioUrl =
        audioUrlResult.status === 'fulfilled'
          ? audioUrlResult.value
          : undefined;

      const updates: Record<string, unknown> = {};
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (audioUrl !== undefined) updates.audioUrl = audioUrl;

      if (Object.keys(updates).length > 0) {
        card = await this.cardsRepository.updateGlobalCard(cardId, updates);
        await this.cacheManager.set(
          `card:front:${normalizedFront}`,
          card,
          CARD_CACHE_TTL,
        );
      }

      // Step 5: Emit event and update status
      this.eventEmitter.emit('card.enriched', { cardId, deckId, userId });
      await this.updateJobStatus(job, 'completed', cardId, batchId);

      // Step 6: Notify via Pusher
      try {
        await this.pusherService.triggerToUser(userId, 'card.media.ready', {
          cardId,
          front,
          imageUrl,
          audioUrl,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Pusher failed for media update ${front}: ${errorMsg}`,
        );
      }

      this.logger.log(`Enrichment completed for "${normalizedFront}"`);
    });
  }

  private async resolveMeaning(
    normalizedFront: string,
  ): Promise<{ vi: string; examples: string[] }> {
    const cacheKey = `meaning:${normalizedFront}`;
    const cached = await this.cacheManager.get<{
      vi: string;
      examples: string[];
    }>(cacheKey);
    if (cached) return cached;

    const meaning = await this.deepSeekClient.chatShort(normalizedFront);
    await this.cacheManager.set(cacheKey, meaning, MEANING_CACHE_TTL);
    return meaning;
  }

  private async resolveImage(
    normalizedFront: string,
    keyword: string,
  ): Promise<string | undefined> {
    const cacheKey = `image:${normalizedFront}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      return cached === '__NO_IMAGE__' ? undefined : cached;
    }

    const pixUrl = await this.pixabayClient.getFirstImageUrl(keyword);
    if (!pixUrl) {
      await this.cacheManager.set(cacheKey, '__NO_IMAGE__', IMAGE_CACHE_TTL);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(pixUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const uploadResult = await this.storageService.upload(
        buffer,
        `${normalizedFront}.jpg`,
        { folder: 'cards/images' },
      );
      await this.cacheManager.set(cacheKey, uploadResult.url, IMAGE_CACHE_TTL);
      return uploadResult.url;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Image fetch/upload failed for ${normalizedFront}: ${errorMsg}`,
      );
      await this.cacheManager.set(cacheKey, '__NO_IMAGE__', IMAGE_CACHE_TTL);
      return undefined;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async resolveAudio(
    normalizedFront: string,
  ): Promise<string | undefined> {
    const cacheKey = `audio:${normalizedFront}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) return cached;

    try {
      const audioBuffer = await this.ttsClient.synthesize(normalizedFront);
      if (!audioBuffer) return undefined;

      const uploadResult = await this.storageService.upload(
        audioBuffer,
        `${normalizedFront}.mp3`,
        { folder: 'cards/audio' },
      );
      await this.cacheManager.set(cacheKey, uploadResult.url, AUDIO_CACHE_TTL);
      return uploadResult.url;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Audio generation failed for ${normalizedFront}: ${errorMsg}`,
      );
      return undefined;
    }
  }

  private async updateJobStatus(
    job: Job<EnrichmentJobData>,
    status: 'completed' | 'failed',
    cardId?: string,
    batchId?: string,
    error?: string,
  ): Promise<void> {
    const result = {
      status,
      cardId,
      front: job.data.normalizedFront,
      error,
      updatedAt: new Date().toISOString(),
    };
    await this.cacheManager.set(`job:${job.id}`, result, 7 * 86400);

    if (batchId) {
      await this.updateBatchProgress(
        batchId,
        status,
        cardId,
        job.data.normalizedFront,
        error,
      );
    }
  }

  private async updateBatchProgress(
    batchId: string,
    status: 'completed' | 'failed',
    cardId?: string,
    front?: string,
    error?: string,
  ): Promise<void> {
    const batch = await this.cacheManager.get<BatchJobResult>(
      `batch:${batchId}`,
    );
    if (!batch) return;

    const item = batch.items.find((i) => i.front === front);
    if (item) {
      item.status = status;
      item.cardId = cardId ?? null;
      if (error) item.error = error;
    }

    batch.progress.completed = batch.items.filter(
      (i) => i.status === 'completed',
    ).length;
    batch.progress.failed = batch.items.filter(
      (i) => i.status === 'failed',
    ).length;

    const allDone =
      batch.progress.completed + batch.progress.failed === batch.progress.total;
    batch.status = allDone
      ? batch.progress.failed > 0
        ? 'partial'
        : 'completed'
      : 'processing';

    await this.cacheManager.set(`batch:${batchId}`, batch, 7 * 86400);
  }
}
