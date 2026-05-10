// src/modules/cards/processors/media-enrichment.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CardsRepository } from '../cards.repository';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { RedisLockService } from '@infrastructure/redis/redis-lock.service';
import {
  MediaEnrichmentJobData,
  BatchJobResult,
} from '@common/interfaces/job.interface';
import { PUSHER_EVENTS } from '@common/constants/events.constants';
import { extractKeywordForImage } from '../utils/card-media.util';

const CARD_CACHE_TTL = 86400; // 24h
const IMAGE_CACHE_TTL = 2592000; // 30 days
const AUDIO_CACHE_TTL = 2592000; // 30 days
const FETCH_TIMEOUT_MS = 5000; // 5s

@Injectable()
@Processor('media-enrichment')
export class MediaEnrichmentProcessor {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly pixabayClient: PixabayClient,
    private readonly ttsClient: GoogleTtsClient,
    private readonly storageService: StorageService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly lockService: RedisLockService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pusherService: PusherService,
    @InjectQueue('failed-tts')
    private readonly failedTtsQueue: Queue,
  ) {
    this.logger.setContext(MediaEnrichmentProcessor.name);
  }

  @Process('enrich-media')
  async handleMedia(job: Job<MediaEnrichmentJobData>): Promise<void> {
    const { cardId, front, normalizedFront, userId, deckId, batchId } =
      job.data;
    const lockKey = `lock:media:${normalizedFront}`;

    await this.lockService.withLock(lockKey, 30, async () => {
      // Double-check after lock
      let card = await this.cardsRepository.findGlobalCardById(cardId);
      if (!card) {
        this.logger.warn(`Card ${cardId} not found, aborting media enrichment`);
        return;
      }

      // If already has both image and audio, skip
      if (card.imageUrl && card.audioUrl) {
        this.logger.log(
          `Media already enriched for "${normalizedFront}", skipping`,
        );
        return;
      }

      // Step 1: Optional image + audio (parallel, non-blocking)
      const keyword = extractKeywordForImage(front);
      const [imageUrlResult, audioUrlResult] = await Promise.allSettled([
        this.resolveImage(normalizedFront, keyword, cardId),
        this.resolveAudio(normalizedFront, job),
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

      // Determine final status
      const hasImage = imageUrl !== undefined || card.imageUrl;
      const hasAudio = audioUrl !== undefined || card.audioUrl;
      const meaningReady = card.back && card.back !== 'Processing...';

      if (meaningReady && hasImage && hasAudio) {
        updates.status = 'completed';
      } else if (meaningReady) {
        updates.status = 'partial';
      }

      if (Object.keys(updates).length > 0) {
        card = await this.cardsRepository.updateGlobalCard(cardId, updates);
        await this.cacheManager.set(
          `card:front:${normalizedFront}`,
          card,
          CARD_CACHE_TTL,
        );
      }

      // Step 2: Emit event and update batch progress
      this.eventEmitter.emit('card.enriched', { cardId, deckId, userId });
      if (batchId) {
        await this.updateBatchProgress(
          batchId,
          'completed',
          cardId,
          normalizedFront,
        );
      }

      // Step 3: Notify via Pusher
      try {
        await this.pusherService.triggerToUser(
          userId,
          PUSHER_EVENTS.CARD_MEDIA_READY,
          {
            cardId,
            front,
            imageUrl: card.imageUrl,
            audioUrl: card.audioUrl,
          },
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Pusher failed for media update ${front}: ${errorMsg}`,
        );
      }

      this.logger.log(
        `Media enrichment completed for "${normalizedFront}" (status: ${card.status})`,
      );
    });
  }

  private async resolveImage(
    normalizedFront: string,
    keyword: string,
    cardId: string,
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
      const timestamp = Date.now();
      const uploadResult = await this.storageService.upload(
        buffer,
        `${normalizedFront}.jpg`,
        {
          folder: 'cards/images',
          publicId: `cards/images/${cardId}_${timestamp}`,
        },
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
    job: Job<MediaEnrichmentJobData>,
  ): Promise<string | undefined> {
    const cacheKey = `audio:${normalizedFront}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) return cached;

    try {
      const audioBuffer = await this.ttsClient.synthesize(normalizedFront);
      if (!audioBuffer) return undefined;

      const timestamp = Date.now();
      const uploadResult = await this.storageService.upload(
        audioBuffer,
        `${normalizedFront}.mp3`,
        {
          folder: 'cards/audio',
          publicId: `cards/audio/${job.data.cardId}_${timestamp}`,
        },
      );
      await this.cacheManager.set(cacheKey, uploadResult.url, AUDIO_CACHE_TTL);
      return uploadResult.url;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Check if we've exhausted retries
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        // Move to DLQ (failed-tts)
        this.logger.warn(
          `TTS failed after ${job.attemptsMade} attempts for "${normalizedFront}": ${errorMsg}. Moving to DLQ.`,
        );
        await this.failedTtsQueue.add(
          'failed-tts',
          {
            cardId: job.data.cardId,
            front: normalizedFront,
            userId: job.data.userId,
            deckId: job.data.deckId,
            error: errorMsg,
          },
          {
            jobId: `failed-tts:${normalizedFront}:${Date.now()}`,
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );

        // Notify client about TTS failure
        try {
          await this.pusherService.triggerToUser(
            job.data.userId,
            PUSHER_EVENTS.CARD_TTS_FAILED,
            {
              cardId: job.data.cardId,
              front: normalizedFront,
              message:
                'Cannot generate audio automatically. You can upload manually.',
            },
          );
        } catch (pusherErr) {
          const pusherMsg =
            pusherErr instanceof Error ? pusherErr.message : String(pusherErr);
          this.logger.warn(
            `Pusher failed for TTS failure notification: ${pusherMsg}`,
          );
        }

        // Update card status to partial (meaning ready but audio failed)
        await this.cardsRepository.updateStatus(
          job.data.cardId,
          'partial',
          `Audio generation failed: ${errorMsg}`,
        );
      } else {
        // Still have retries left, log warning
        this.logger.warn(
          `Audio generation failed for ${normalizedFront} (attempt ${job.attemptsMade}): ${errorMsg}. Will retry.`,
        );
      }

      return undefined;
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
