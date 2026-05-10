import { Test, TestingModule } from '@nestjs/testing';
import { AiEnrichmentProcessor } from '@modules/cards/processors/ai-enrichment.processor';
import { CardsRepository } from '@modules/cards/cards.repository';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { LoggerService } from '@common/logger/logger.service';
import { getQueueToken } from '@nestjs/bull';
import { PUSHER_EVENTS } from '@common/constants/events.constants';
import type { Job } from 'bull';
import type { AiEnrichmentJobData } from '@common/interfaces/job.interface';

describe('AiEnrichmentProcessor', () => {
  let processor: AiEnrichmentProcessor;
  let cardsRepository: jest.Mocked<CardsRepository>;
  let deepSeekClient: jest.Mocked<DeepSeekClient>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let pusherService: jest.Mocked<PusherService>;
  let logger: jest.Mocked<LoggerService>;
  let mediaEnrichmentQueue: { add: jest.Mock };

  const mockJob = (
    overrides: Partial<AiEnrichmentJobData> = {},
  ): Job<AiEnrichmentJobData> =>
    ({
      data: {
        cardId: 'card-1',
        front: 'apple',
        userId: 'user-1',
        deckId: 'deck-1',
        batchId: 'batch-1',
        ...overrides,
      },
    }) as Job<AiEnrichmentJobData>;

  const mockMeaning = {
    vi: 'quả táo',
    ex: 'I eat an apple every day.',
    pronounce: '/ˈæp.əl/',
    pos: 'noun',
    synonyms: 'fruit',
    antonyms: '',
  };

  const mockCard = {
    id: 'card-1',
    front: 'apple',
    back: null,
    status: 'pending',
    extras: {},
    imageUrl: null,
    audioUrl: null,
    errorMessage: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCardsRepository = {
      updateGlobalCard: jest.fn(),
      updateStatus: jest.fn(),
    };
    const mockDeepSeekClient = {
      chatShort: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      reset: jest.fn(),
      ping: jest.fn(),
    };
    const mockPusherService = {
      triggerToUser: jest.fn(),
    };
    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockMediaEnrichmentQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEnrichmentProcessor,
        { provide: CardsRepository, useValue: mockCardsRepository },
        { provide: DeepSeekClient, useValue: mockDeepSeekClient },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: PusherService, useValue: mockPusherService },
        { provide: LoggerService, useValue: mockLogger },
        {
          provide: getQueueToken('media-enrichment'),
          useValue: mockMediaEnrichmentQueue,
        },
      ],
    }).compile();

    processor = module.get(AiEnrichmentProcessor);
    cardsRepository = module.get(CardsRepository);
    deepSeekClient = module.get(DeepSeekClient);
    cacheManager = module.get('ICacheManager');
    pusherService = module.get(PusherService);
    logger = module.get(LoggerService);
    mediaEnrichmentQueue = module.get(getQueueToken('media-enrichment'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleFetchMeaning', () => {
    it('should use cached meaning if available', async () => {
      cacheManager.get.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(deepSeekClient.chatShort).not.toHaveBeenCalled();
      expect(cardsRepository.updateGlobalCard).toHaveBeenCalled();
      expect(mediaEnrichmentQueue.add).toHaveBeenCalled();
    });

    it('should fetch meaning from DeepSeek on cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(deepSeekClient.chatShort).toHaveBeenCalledWith('apple');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'meaning:apple',
        mockMeaning,
        2592000,
      );
    });

    it('should handle DeepSeek failure gracefully', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockRejectedValue(new Error('API timeout'));
      cardsRepository.updateStatus.mockResolvedValue(mockCard);

      await processor.handleFetchMeaning(mockJob());

      expect(cardsRepository.updateStatus).toHaveBeenCalledWith(
        'card-1',
        'failed',
        'API timeout',
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        PUSHER_EVENTS.CARD_MEANING_FAILED,
        expect.objectContaining({ cardId: 'card-1', front: 'apple' }),
      );
      expect(mediaEnrichmentQueue.add).not.toHaveBeenCalled();
    });

    it('should build rich back content with all fields', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(cardsRepository.updateGlobalCard).toHaveBeenCalledWith('card-1', {
        back: expect.stringContaining('📢 /ˈæp.əl/'),
        status: 'meaning_ready',
        extras: expect.objectContaining({
          meaningReady: true,
          pronounce: '/ˈæp.əl/',
          pos: 'noun',
          synonyms: 'fruit',
        }),
      });
    });

    it('should build back content without optional fields', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue({
        vi: 'quả táo',
        ex: '',
        pronounce: '',
        pos: '',
        synonyms: '',
        antonyms: '',
      });
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(cardsRepository.updateGlobalCard).toHaveBeenCalledWith('card-1', {
        back: 'quả táo',
        status: 'meaning_ready',
        extras: expect.objectContaining({
          meaningReady: true,
          pronounce: undefined,
          pos: undefined,
        }),
      });
    });

    it('should update cache after successful enrichment', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(cacheManager.set).toHaveBeenCalledWith(
        'card:front:apple',
        mockCard,
        86400,
      );
    });

    it('should notify client via Pusher on success', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        PUSHER_EVENTS.CARD_MEANING_READY,
        expect.objectContaining({ cardId: 'card-1', front: 'apple' }),
      );
    });

    it('should not fail if Pusher notification fails', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      pusherService.triggerToUser.mockRejectedValue(
        new Error('Pusher connection error'),
      );
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await expect(
        processor.handleFetchMeaning(mockJob()),
      ).resolves.not.toThrow();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Pusher failed'),
      );
    });

    it('should update batch progress when batchId is provided', async () => {
      cacheManager.get
        .mockResolvedValueOnce(null) // meaning cache
        .mockResolvedValueOnce({
          // batch cache
          batchId: 'batch-1',
          status: 'processing',
          progress: { total: 2, completed: 0, failed: 0 },
          items: [
            { front: 'apple', status: 'pending', cardId: null },
            { front: 'banana', status: 'pending', cardId: null },
          ],
        });
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(cacheManager.set).toHaveBeenCalledWith(
        'batch:batch-1',
        expect.objectContaining({
          progress: expect.objectContaining({ completed: 1 }),
        }),
        604800,
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        PUSHER_EVENTS.BATCH_PROGRESS,
        expect.objectContaining({
          batchId: 'batch-1',
          lastCompleted: 'apple',
        }),
      );
    });

    it('should handle batch progress update failure gracefully', async () => {
      cacheManager.get
        .mockResolvedValueOnce(null) // meaning cache
        .mockRejectedValueOnce(new Error('Cache error')); // batch cache fails
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await expect(
        processor.handleFetchMeaning(mockJob()),
      ).resolves.not.toThrow();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Batch progress update failed'),
      );
    });

    it('should enqueue media enrichment after meaning is ready', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(mediaEnrichmentQueue.add).toHaveBeenCalledWith(
        'enrich-media',
        expect.objectContaining({
          cardId: 'card-1',
          front: 'apple',
          normalizedFront: 'apple',
          userId: 'user-1',
          deckId: 'deck-1',
          batchId: 'batch-1',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }),
      );
    });

    it('should normalize front to lowercase trimmed', async () => {
      cacheManager.get.mockResolvedValue(null);
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob({ front: '  Apple  ' }));

      expect(deepSeekClient.chatShort).toHaveBeenCalledWith('apple');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'meaning:apple',
        expect.any(Object),
        expect.any(Number),
      );
    });

    it('should mark batch as completed when all items done', async () => {
      cacheManager.get
        .mockResolvedValueOnce(null) // meaning cache
        .mockResolvedValueOnce({
          // batch cache - last item
          batchId: 'batch-1',
          status: 'processing',
          progress: { total: 1, completed: 0, failed: 0 },
          items: [{ front: 'apple', status: 'pending', cardId: null }],
        });
      deepSeekClient.chatShort.mockResolvedValue(mockMeaning);
      cardsRepository.updateGlobalCard.mockResolvedValue(mockCard);
      mediaEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await processor.handleFetchMeaning(mockJob());

      expect(cacheManager.set).toHaveBeenCalledWith(
        'batch:batch-1',
        expect.objectContaining({ status: 'completed' }),
        604800,
      );
    });
  });
});
