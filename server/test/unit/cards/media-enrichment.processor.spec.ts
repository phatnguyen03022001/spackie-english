import { Test, TestingModule } from '@nestjs/testing';
import { MediaEnrichmentProcessor } from '@modules/cards/processors/media-enrichment.processor';
import { CardsRepository } from '@modules/cards/cards.repository';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { RedisLockService } from '@infrastructure/redis/redis-lock.service';
import { getQueueToken } from '@nestjs/bull';
import { PUSHER_EVENTS } from '@common/constants/events.constants';
import { FileManagerService } from '@modules/file-manager/file-manager.service';

describe('MediaEnrichmentProcessor', () => {
  let processor: MediaEnrichmentProcessor;
  let cardsRepository: jest.Mocked<CardsRepository>;
  let pixabayClient: jest.Mocked<PixabayClient>;
  let ttsClient: jest.Mocked<GoogleTtsClient>;
  let storageService: jest.Mocked<StorageService>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let lockService: jest.Mocked<RedisLockService>;
  let logger: jest.Mocked<LoggerService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let pusherService: jest.Mocked<PusherService>;
  let failedTtsQueue: { add: jest.Mock };

  const mockCard = {
    id: 'card-1',
    front: 'apple',
    back: 'quả táo',
    status: 'meaning_ready',
    extras: {},
    imageUrl: null,
    audioUrl: null,
    errorMessage: null,
    validated: false,
    valid: null,
    validationError: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJob = (overrides: Record<string, unknown> = {}) => {
    const { data: dataOverrides, ...restOverrides } = overrides as any;
    return {
      data: {
        cardId: 'card-1',
        front: 'apple',
        normalizedFront: 'apple',
        userId: 'user-1',
        deckId: 'deck-1',
        batchId: 'batch-1',
        ...(dataOverrides || {}),
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
      ...restOverrides,
    } as any;
  };

  beforeEach(async () => {
    const mockCardsRepository = {
      findGlobalCardById: jest.fn(),
      updateGlobalCard: jest.fn(),
      updateStatus: jest.fn(),
    };
    const mockPixabayClient = {
      getFirstImageUrl: jest.fn(),
    };
    const mockTtsClient = {
      synthesize: jest.fn(),
    };
    const mockStorageService = {
      upload: jest.fn(),
      delete: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      reset: jest.fn(),
      ping: jest.fn(),
    };
    const mockLockService = {
      withLock: jest.fn(),
    };
    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockEventEmitter = {
      emit: jest.fn(),
    };
    const mockPusherService = {
      triggerToUser: jest.fn(),
    };
    const mockFailedTtsQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaEnrichmentProcessor,
        { provide: CardsRepository, useValue: mockCardsRepository },
        { provide: PixabayClient, useValue: mockPixabayClient },
        { provide: GoogleTtsClient, useValue: mockTtsClient },
        { provide: StorageService, useValue: mockStorageService },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: RedisLockService, useValue: mockLockService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PusherService, useValue: mockPusherService },
        {
          provide: getQueueToken('failed-tts'),
          useValue: mockFailedTtsQueue,
        },
        {
          provide: FileManagerService,
          useValue: {
            uploadFromUrl: jest.fn().mockResolvedValue({
              url: 'https://storage.com/cards/images/apple.jpg',
              id: 'file-1',
            }),
          },
        },
      ],
    }).compile();

    processor = module.get(MediaEnrichmentProcessor);
    cardsRepository = module.get(CardsRepository);
    pixabayClient = module.get(PixabayClient);
    ttsClient = module.get(GoogleTtsClient);
    storageService = module.get(StorageService);
    cacheManager = module.get('ICacheManager');
    lockService = module.get(RedisLockService);
    logger = module.get(LoggerService);
    eventEmitter = module.get(EventEmitter2);
    pusherService = module.get(PusherService);
    failedTtsQueue = module.get(getQueueToken('failed-tts'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMedia', () => {
    it('should skip if card not found', async () => {
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(null);

      await processor.handleMedia(mockJob());

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Card card-1 not found'),
      );
      expect(cardsRepository.updateGlobalCard).not.toHaveBeenCalled();
    });

    it('should skip if card already has image and audio', async () => {
      const enrichedCard = {
        ...mockCard,
        imageUrl: 'https://example.com/img.jpg',
        audioUrl: 'https://example.com/audio.mp3',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(enrichedCard);

      await processor.handleMedia(mockJob());

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('already enriched'),
      );
      expect(cardsRepository.updateGlobalCard).not.toHaveBeenCalled();
    });

    it('should resolve image and audio and update card with completed status', async () => {
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'completed',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      // Use mockImplementation to handle parallel calls correctly
      storageService.upload.mockImplementation(
        (buffer: Buffer, filename: string) => {
          if (filename.includes('.mp3')) {
            return Promise.resolve({
              url: 'https://storage.com/cards/audio/apple.mp3',
              publicId: 'cards/audio/apple',
              format: 'mp3',
              size: 50,
            });
          }
          return Promise.resolve({
            url: 'https://storage.com/cards/images/apple.jpg',
            publicId: 'cards/images/apple',
            format: 'jpg',
            size: 100,
          });
        },
      );
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(mockJob());

      expect(cardsRepository.updateGlobalCard).toHaveBeenCalledWith('card-1', {
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'completed',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.enriched', {
        cardId: 'card-1',
        deckId: 'deck-1',
        userId: 'user-1',
      });
    });

    it('should set status to partial if meaning not ready (back is Processing...)', async () => {
      const cardNoBack = { ...mockCard, back: 'Processing...' };
      const updatedCard = {
        ...cardNoBack,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(cardNoBack);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      storageService.upload.mockImplementation(
        (buffer: Buffer, filename: string) => {
          if (filename.includes('.mp3')) {
            return Promise.resolve({
              url: 'https://storage.com/cards/audio/apple.mp3',
              publicId: 'cards/audio/apple',
              format: 'mp3',
              size: 50,
            });
          }
          return Promise.resolve({
            url: 'https://storage.com/cards/images/apple.jpg',
            publicId: 'cards/images/apple',
            format: 'jpg',
            size: 100,
          });
        },
      );
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(mockJob());

      // When meaning is not ready, status is NOT set (only imageUrl and audioUrl)
      expect(cardsRepository.updateGlobalCard).toHaveBeenCalledWith('card-1', {
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
      });
    });

    it('should handle image fetch failure gracefully (only audio)', async () => {
      const updatedCard = {
        ...mockCard,
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(null); // no image
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      storageService.upload.mockResolvedValue({
        url: 'https://storage.com/cards/audio/apple.mp3',
        publicId: 'cards/audio/apple',
        format: 'mp3',
        size: 50,
      });
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(mockJob());

      // When meaning is ready but only audio is available, status is 'partial'
      expect(cardsRepository.updateGlobalCard).toHaveBeenCalledWith('card-1', {
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'partial',
      });
    });

    it('should handle TTS failure and move to DLQ after max attempts', async () => {
      const exhaustedJob = mockJob({ attemptsMade: 3 });
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      storageService.upload.mockResolvedValue({
        url: 'https://storage.com/cards/images/apple.jpg',
        publicId: 'cards/images/apple',
        format: 'jpg',
        size: 100,
      });
      ttsClient.synthesize.mockRejectedValue(new Error('TTS API error'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(exhaustedJob);

      expect(ttsClient.synthesize).toHaveBeenCalledWith('apple');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('TTS failed after 3 attempts'),
      );

      expect(failedTtsQueue.add).toHaveBeenCalledWith(
        'failed-tts',
        expect.objectContaining({
          cardId: 'card-1',
          front: 'apple',
          error: 'TTS API error',
        }),
        expect.any(Object),
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        PUSHER_EVENTS.CARD_TTS_FAILED,
        expect.any(Object),
      );
      expect(cardsRepository.updateStatus).toHaveBeenCalledWith(
        'card-1',
        'partial',
        expect.stringContaining('Audio generation failed'),
      );
    });

    it('should log warning on TTS failure if retries remain', async () => {
      const retryJob = mockJob({ attemptsMade: 1 });
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      storageService.upload.mockResolvedValue({
        url: 'https://storage.com/cards/images/apple.jpg',
        publicId: 'cards/images/apple',
        format: 'jpg',
        size: 100,
      });
      ttsClient.synthesize.mockRejectedValue(new Error('TTS API error'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(retryJob);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Will retry'),
      );
      expect(failedTtsQueue.add).not.toHaveBeenCalled();
    });

    it('should use cached image URL if available', async () => {
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://cached-image.com/img.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'completed',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get
        .mockResolvedValueOnce('https://cached-image.com/img.jpg') // image cache
        .mockResolvedValueOnce(null); // audio cache miss
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      storageService.upload.mockResolvedValue({
        url: 'https://storage.com/cards/audio/apple.mp3',
        publicId: 'cards/audio/apple',
        format: 'mp3',
        size: 50,
      });
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(mockJob());

      expect(pixabayClient.getFirstImageUrl).not.toHaveBeenCalled();
      expect(storageService.upload).toHaveBeenCalledTimes(1); // only audio
    });

    it('should notify via Pusher on success', async () => {
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'completed',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      storageService.upload.mockImplementation(
        (buffer: Buffer, filename: string) => {
          if (filename.includes('.mp3')) {
            return Promise.resolve({
              url: 'https://storage.com/cards/audio/apple.mp3',
              publicId: 'cards/audio/apple',
              format: 'mp3',
              size: 50,
            });
          }
          return Promise.resolve({
            url: 'https://storage.com/cards/images/apple.jpg',
            publicId: 'cards/images/apple',
            format: 'jpg',
            size: 100,
          });
        },
      );
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(mockJob());

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        PUSHER_EVENTS.CARD_MEDIA_READY,
        expect.objectContaining({ cardId: 'card-1', front: 'apple' }),
      );
    });

    it('should handle Pusher notification failure gracefully', async () => {
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'completed',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get.mockResolvedValue(null);
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      storageService.upload.mockImplementation(
        (buffer: Buffer, filename: string) => {
          if (filename.includes('.mp3')) {
            return Promise.resolve({
              url: 'https://storage.com/cards/audio/apple.mp3',
              publicId: 'cards/audio/apple',
              format: 'mp3',
              size: 50,
            });
          }
          return Promise.resolve({
            url: 'https://storage.com/cards/images/apple.jpg',
            publicId: 'cards/images/apple',
            format: 'jpg',
            size: 100,
          });
        },
      );
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);
      pusherService.triggerToUser.mockRejectedValue(new Error('Pusher error'));

      await expect(processor.handleMedia(mockJob())).resolves.not.toThrow();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Pusher failed'),
      );
    });

    it('should update batch progress when batchId is provided', async () => {
      const updatedCard = {
        ...mockCard,
        imageUrl: 'https://storage.com/cards/images/apple.jpg',
        audioUrl: 'https://storage.com/cards/audio/apple.mp3',
        status: 'completed',
      };
      lockService.withLock.mockImplementation((_key, _ttl, fn) => fn());
      cardsRepository.findGlobalCardById.mockResolvedValue(mockCard);
      cacheManager.get
        .mockResolvedValueOnce(null) // image cache
        .mockResolvedValueOnce(null) // audio cache
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
      pixabayClient.getFirstImageUrl.mockResolvedValue(
        'https://pixabay.com/img.jpg',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Buffer.from('image-data'),
      }) as any;
      storageService.upload.mockImplementation(
        (buffer: Buffer, filename: string) => {
          if (filename.includes('.mp3')) {
            return Promise.resolve({
              url: 'https://storage.com/cards/audio/apple.mp3',
              publicId: 'cards/audio/apple',
              format: 'mp3',
              size: 50,
            });
          }
          return Promise.resolve({
            url: 'https://storage.com/cards/images/apple.jpg',
            publicId: 'cards/images/apple',
            format: 'jpg',
            size: 100,
          });
        },
      );
      ttsClient.synthesize.mockResolvedValue(Buffer.from('audio-data'));
      cardsRepository.updateGlobalCard.mockResolvedValue(updatedCard);

      await processor.handleMedia(mockJob());

      expect(cacheManager.set).toHaveBeenCalledWith(
        'batch:batch-1',
        expect.objectContaining({
          progress: expect.objectContaining({ completed: 1 }),
        }),
        7 * 86400,
      );
    });
  });
});
