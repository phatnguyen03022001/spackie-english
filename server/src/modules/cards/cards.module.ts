// src/modules/cards/cards.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BullModule } from '@nestjs/bull';
import { CardsDeckController } from './cards-deck.controller';
import { CardsGlobalController } from './cards-global.controller';
import {
  CardsBatchController,
  JobStatusController,
} from './cards-batch.controller';
import { CardsService } from './cards.service';
import { CardsRepository } from './cards.repository';
import { CardMapper } from './mappers/card.mapper';
import { CreateCardAutoUseCase } from './use-cases/create-card-auto.use-case';
import { CreateCardBatchUseCase } from './use-cases/create-card-batch.use-case';
import { AiEnrichmentProcessor } from './processors/ai-enrichment.processor';
import { MediaEnrichmentProcessor } from './processors/media-enrichment.processor';
import { DecksModule } from '@modules/decks/decks.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { ThirdPartyModule } from '@infrastructure/third-party/third-party.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [
    DecksModule,
    RedisModule,
    StorageModule,
    ThirdPartyModule,
    LoggerModule,
    // Queue for AI enrichment (DeepSeek meaning resolution)
    BullModule.registerQueue({
      name: 'ai-enrichment',
      limiter: {
        max: 5,
        duration: 1000, // max 5 AI jobs per second
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        timeout: 15000,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    // Queue for media enrichment (image + TTS audio)
    BullModule.registerQueue({
      name: 'media-enrichment',
      limiter: {
        max: 2,
        duration: 1000, // max 2 media jobs per second
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        timeout: 60000,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    // Dead Letter Queue for failed TTS
    BullModule.registerQueue({
      name: 'failed-tts',
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  ],
  controllers: [
    CardsDeckController,
    CardsGlobalController,
    CardsBatchController,
    JobStatusController,
  ],
  providers: [
    CardsService,
    CardsRepository,
    CardMapper,
    CreateCardAutoUseCase,
    CreateCardBatchUseCase,
    AiEnrichmentProcessor,
    MediaEnrichmentProcessor,
  ],
  exports: [CardsService, CardsRepository],
})
export class CardsModule {}
