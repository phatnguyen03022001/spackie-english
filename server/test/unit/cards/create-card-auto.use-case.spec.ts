import { Test, TestingModule } from '@nestjs/testing';
import { CreateCardAutoUseCase } from '@modules/cards/use-cases/create-card-auto.use-case';
import { CardsRepository } from '@modules/cards/cards.repository';
import { DecksRepository } from '@modules/decks/decks.repository';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { CardMapper } from '@modules/cards/mappers/card.mapper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from '@common/filters/business.exception';
import { getQueueToken } from '@nestjs/bull';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';

describe('CreateCardAutoUseCase', () => {
  let useCase: CreateCardAutoUseCase;
  let cardsRepository: jest.Mocked<CardsRepository>;
  let decksRepository: jest.Mocked<DecksRepository>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let mapper: jest.Mocked<CardMapper>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let aiEnrichmentQueue: { add: jest.Mock };

  const mockDeck = {
    id: 'deck1',
    userId: 'user1',
    title: 'Test Deck',
    visibility: 'PRIVATE',
    totalCards: 0,
  };

  const mockGlobalCard = {
    id: 'card1',
    front: 'apple',
    back: null,
    imageUrl: null,
    audioUrl: null,
    extras: {},
    status: 'pending',
    validated: false,
    valid: null,
    validationError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockResponseDto = { id: 'card1', front: 'apple' };

  beforeEach(async () => {
    aiEnrichmentQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCardAutoUseCase,
        {
          provide: CardsRepository,
          useValue: {
            findGlobalCardByFront: jest.fn(),
            createGlobalCard: jest.fn(),
            mappingExists: jest.fn(),
            createMapping: jest.fn(),
          },
        },
        {
          provide: DecksRepository,
          useValue: {
            findById: jest.fn(),
            incrementTotalCards: jest.fn(),
          },
        },
        {
          provide: 'ICacheManager',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: CardMapper,
          useValue: {
            toResponseDto: jest.fn().mockReturnValue(mockResponseDto),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: getQueueToken('ai-enrichment'),
          useValue: aiEnrichmentQueue,
        },
        {
          provide: WordValidatorClient,
          useValue: {
            validateWord: jest.fn().mockResolvedValue({ isValid: true }),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateCardAutoUseCase);
    cardsRepository = module.get(CardsRepository);
    decksRepository = module.get(DecksRepository);
    cacheManager = module.get('ICacheManager');
    mapper = module.get(CardMapper);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return cached response if idempotencyKey exists', async () => {
      cacheManager.get.mockResolvedValue(mockResponseDto);

      const result = await useCase.execute('user1', 'deck1', 'apple', 'idem-1');

      expect(cacheManager.get).toHaveBeenCalledWith('idempotent:card:idem-1');
      expect(decksRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponseDto);
    });

    it('should throw DECK_NOT_OWNED if deck not found', async () => {
      decksRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('user1', 'deck1', 'apple')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw DECK_NOT_OWNED if not owner', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);

      await expect(
        useCase.execute('otherUser', 'deck1', 'apple'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reuse existing global card and create mapping if not exists', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      cacheManager.get.mockResolvedValue(null);
      cardsRepository.findGlobalCardByFront.mockResolvedValue(
        mockGlobalCard as any,
      );
      cardsRepository.mappingExists.mockResolvedValue(false);

      const result = await useCase.execute('user1', 'deck1', 'apple');

      expect(cardsRepository.createMapping).toHaveBeenCalled();
      expect(decksRepository.incrementTotalCards).toHaveBeenCalledWith(
        'deck1',
        1,
      );
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.created', {
        cardId: 'card1',
        deckId: 'deck1',
        userId: 'user1',
      });
      expect(mapper.toResponseDto).toHaveBeenCalledWith(mockGlobalCard);
      expect(result).toEqual(mockResponseDto);
    });

    it('should not create mapping if already exists for existing global card', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      cacheManager.get.mockResolvedValue(null);
      cardsRepository.findGlobalCardByFront.mockResolvedValue(
        mockGlobalCard as any,
      );
      cardsRepository.mappingExists.mockResolvedValue(true);

      await useCase.execute('user1', 'deck1', 'apple');

      expect(cardsRepository.createMapping).not.toHaveBeenCalled();
      expect(decksRepository.incrementTotalCards).not.toHaveBeenCalled();
    });

    it('should create new global card with pending status and enqueue AI job', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      cacheManager.get.mockResolvedValue(null);
      cardsRepository.findGlobalCardByFront.mockResolvedValue(null);
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard as any);
      cardsRepository.mappingExists.mockResolvedValue(false);

      const result = await useCase.execute('user1', 'deck1', 'apple');

      expect(cardsRepository.createGlobalCard).toHaveBeenCalledWith({
        front: 'apple',
        back: null,
        imageUrl: null,
        audioUrl: null,
        extras: {},
        status: 'pending',
        validated: true,
        valid: true,
      });
      expect(cardsRepository.createMapping).toHaveBeenCalled();
      expect(decksRepository.incrementTotalCards).toHaveBeenCalledWith(
        'deck1',
        1,
      );
      expect(aiEnrichmentQueue.add).toHaveBeenCalledWith(
        'fetch-meaning',
        expect.objectContaining({
          cardId: 'card1',
          front: 'apple',
          userId: 'user1',
          deckId: 'deck1',
        }),
        expect.objectContaining({
          attempts: 2,
          timeout: 15000,
        }),
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'card:front:apple',
        mockGlobalCard,
        86400,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.created', {
        cardId: 'card1',
        deckId: 'deck1',
        userId: 'user1',
      });
      expect(result).toEqual(mockResponseDto);
    });

    it('should cache idempotency response when idempotencyKey provided', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      cacheManager.get.mockResolvedValue(null);
      cardsRepository.findGlobalCardByFront.mockResolvedValue(null);
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard as any);

      await useCase.execute('user1', 'deck1', 'apple', 'idem-2');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'idempotent:card:idem-2',
        mockResponseDto,
        86400,
      );
    });

    it('should normalize front text (trim, lowercase)', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      cacheManager.get.mockResolvedValue(null);
      cardsRepository.findGlobalCardByFront.mockResolvedValue(null);
      cardsRepository.createGlobalCard.mockResolvedValue(mockGlobalCard as any);

      await useCase.execute('user1', 'deck1', '  Apple  ');

      expect(cardsRepository.findGlobalCardByFront).toHaveBeenCalledWith(
        'apple',
      );
      expect(cardsRepository.createGlobalCard).toHaveBeenCalledWith(
        expect.objectContaining({ front: 'apple' }),
      );
    });

    it('should use cached global card from cacheManager', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      // No idempotencyKey passed, so first cacheManager.get call is for card:front:apple
      cacheManager.get.mockResolvedValue(mockGlobalCard);
      cardsRepository.mappingExists.mockResolvedValue(false);

      const result = await useCase.execute('user1', 'deck1', 'apple');

      expect(cardsRepository.findGlobalCardByFront).not.toHaveBeenCalled();
      expect(cardsRepository.createMapping).toHaveBeenCalled();
      expect(result).toEqual(mockResponseDto);
    });
  });
});
