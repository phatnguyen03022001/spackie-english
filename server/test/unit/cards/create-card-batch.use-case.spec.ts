import { Test, TestingModule } from '@nestjs/testing';
import { CreateCardBatchUseCase } from '@modules/cards/use-cases/create-card-batch.use-case';
import { CardsRepository } from '@modules/cards/cards.repository';
import { DecksRepository } from '@modules/decks/decks.repository';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { getQueueToken } from '@nestjs/bull';
import { BusinessException } from '@common/filters/business.exception';
import { CreateCardBatchDto } from '@modules/cards/dto/create-card-batch.dto';

describe('CreateCardBatchUseCase', () => {
  let useCase: CreateCardBatchUseCase;
  let cardsRepository: jest.Mocked<CardsRepository>;
  let decksRepository: jest.Mocked<DecksRepository>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let logger: jest.Mocked<LoggerService>;
  let aiEnrichmentQueue: { add: jest.Mock };

  const mockDeck = {
    id: 'deck-1',
    userId: 'user-1',
    title: 'Test Deck',
    description: null,
    totalCards: 0,
    coverUrl: null,
    visibility: 'PRIVATE' as any,
    tags: [],
    isVipOnly: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGlobalCard = {
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

  const createDto = (overrides = {}): CreateCardBatchDto =>
    ({
      fronts: ['apple', 'banana'],
      ...overrides,
    }) as CreateCardBatchDto;

  beforeEach(async () => {
    const mockCardsRepository = {
      findGlobalCardsByFronts: jest.fn(),
      createGlobalCard: jest.fn(),
      createMappingsBatch: jest.fn(),
    };
    const mockDecksRepository = {
      findById: jest.fn(),
      incrementTotalCards: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      reset: jest.fn(),
      ping: jest.fn(),
    };
    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockAiEnrichmentQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCardBatchUseCase,
        { provide: CardsRepository, useValue: mockCardsRepository },
        { provide: DecksRepository, useValue: mockDecksRepository },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: LoggerService, useValue: mockLogger },
        {
          provide: getQueueToken('ai-enrichment'),
          useValue: mockAiEnrichmentQueue,
        },
      ],
    }).compile();

    useCase = module.get(CreateCardBatchUseCase);
    cardsRepository = module.get(CardsRepository);
    decksRepository = module.get(DecksRepository);
    cacheManager = module.get('ICacheManager');
    logger = module.get(LoggerService);
    aiEnrichmentQueue = module.get(getQueueToken('ai-enrichment'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return cached result if idempotency key exists', async () => {
      const cachedResult = { batchId: 'cached-batch', jobIds: ['job-1'] };
      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await useCase.execute('user-1', 'deck-1', {
        fronts: ['apple'],
        idempotencyKey: 'key-1',
      });

      expect(result).toEqual(cachedResult);
      expect(decksRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw if deck not found', async () => {
      decksRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('user-1', 'deck-1', createDto()),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw if user does not own deck', async () => {
      decksRepository.findById.mockResolvedValue({
        ...mockDeck,
        userId: 'other-user',
      });

      await expect(
        useCase.execute('user-1', 'deck-1', createDto()),
      ).rejects.toThrow(BusinessException);
    });

    it('should create new cards and reuse existing ones', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(
        new Map([['apple', { ...mockGlobalCard, front: 'apple' }]]),
      );
      cardsRepository.createGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        id: 'card-2',
        front: 'banana',
      });
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await useCase.execute('user-1', 'deck-1', createDto());

      expect(cardsRepository.createGlobalCard).toHaveBeenCalledWith({
        front: 'banana',
        back: null,
        extras: {},
        status: 'pending',
      });
      expect(cardsRepository.createMappingsBatch).toHaveBeenCalledWith(
        'deck-1',
        ['card-1', 'card-2'],
      );
      expect(decksRepository.incrementTotalCards).toHaveBeenCalledWith(
        'deck-1',
        2,
      );
      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('jobIds');
      expect(result.jobIds).toHaveLength(1); // only new card gets AI job
    });

    it('should handle all existing cards (no new cards)', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(
        new Map([
          ['apple', { ...mockGlobalCard, front: 'apple' }],
          ['banana', { ...mockGlobalCard, id: 'card-2', front: 'banana' }],
        ]),
      );

      const result = await useCase.execute('user-1', 'deck-1', createDto());

      expect(cardsRepository.createGlobalCard).not.toHaveBeenCalled();
      expect(aiEnrichmentQueue.add).not.toHaveBeenCalled();
      expect(result.jobIds).toHaveLength(0);
    });

    it('should dedupe fronts', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(new Map());
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard);
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await useCase.execute('user-1', 'deck-1', {
        fronts: ['apple', 'APPLE', '  Apple  '],
      });

      expect(cardsRepository.createGlobalCard).toHaveBeenCalledTimes(1);
      expect(cardsRepository.createMappingsBatch).toHaveBeenCalledWith(
        'deck-1',
        ['card-1'],
      );
      expect(result.jobIds).toHaveLength(1);
    });

    it('should initialize batch progress cache', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(
        new Map([['apple', { ...mockGlobalCard, front: 'apple' }]]),
      );
      cardsRepository.createGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        id: 'card-2',
        front: 'banana',
      });
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await useCase.execute('user-1', 'deck-1', createDto());

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('batch:'),
        expect.objectContaining({
          status: 'processing',
          progress: { total: 2, completed: 1, failed: 0 },
          items: expect.arrayContaining([
            expect.objectContaining({ front: 'apple', status: 'completed' }),
            expect.objectContaining({ front: 'banana', status: 'pending' }),
          ]),
        }),
        7 * 86400,
      );
    });

    it('should cache idempotency response', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(new Map());
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard);
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await useCase.execute('user-1', 'deck-1', {
        fronts: ['apple'],
        idempotencyKey: 'key-1',
      });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'idempotent:batch:key-1',
        expect.objectContaining({ batchId: expect.any(String) }),
        86400,
      );
    });

    it('should invalidate deck cache after batch creation', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(new Map());
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard);
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await useCase.execute('user-1', 'deck-1', createDto());

      expect(cacheManager.delPattern).toHaveBeenCalledWith(
        'cards:deck:deck-1:*',
      );
      expect(cacheManager.delPattern).toHaveBeenCalledWith(
        'decks:own:list:*:userId:user-1:*',
      );
    });

    it('should enqueue AI enrichment jobs for new cards', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(new Map());
      cardsRepository.createGlobalCard
        .mockResolvedValueOnce({
          ...mockGlobalCard,
          id: 'card-1',
          front: 'apple',
        })
        .mockResolvedValueOnce({
          ...mockGlobalCard,
          id: 'card-2',
          front: 'banana',
        });
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await useCase.execute('user-1', 'deck-1', createDto());

      expect(aiEnrichmentQueue.add).toHaveBeenCalledTimes(2);
      expect(aiEnrichmentQueue.add).toHaveBeenCalledWith(
        'fetch-meaning',
        expect.objectContaining({
          cardId: 'card-1',
          front: 'apple',
          userId: 'user-1',
          deckId: 'deck-1',
        }),
        expect.objectContaining({
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
        }),
      );
    });

    it('should warm cache for new cards', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck);
      cardsRepository.findGlobalCardsByFronts.mockResolvedValue(new Map());
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard);
      aiEnrichmentQueue.add.mockResolvedValue({ id: 'job-1' });

      await useCase.execute('user-1', 'deck-1', createDto());

      expect(cacheManager.set).toHaveBeenCalledWith(
        'card:front:apple',
        mockGlobalCard,
        86400,
      );
    });
  });
});
