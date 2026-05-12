import { Test, TestingModule } from '@nestjs/testing';
import { CardsService } from '@modules/cards/cards.service';
import { CardsRepository } from '@modules/cards/cards.repository';
import { CardMapper } from '@modules/cards/mappers/card.mapper';
import { DecksRepository } from '@modules/decks/decks.repository';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from '@common/filters/business.exception';
import { CreateCardDto } from '@modules/cards/dto/create-card.dto';
import { UpdateCardDto } from '@modules/cards/dto/update-card.dto';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { LoggerService } from '@common/logger/logger.service';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { PrismaService } from '@database/prisma.service';

describe('CardsService', () => {
  let service: CardsService;
  let repository: jest.Mocked<CardsRepository>;
  let decksRepository: jest.Mocked<DecksRepository>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let deepSeekClient: jest.Mocked<DeepSeekClient>;
  let storageService: jest.Mocked<StorageService>;
  let logger: jest.Mocked<LoggerService>;
  let uploadFileUseCase: jest.Mocked<UploadFileUseCase>;

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
    back: 'quả táo',
    imageUrl: null,
    audioUrl: null,
    extras: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMapping = {
    id: 'mapping1',
    deckId: 'deck1',
    globalCardId: 'card1',
    sortOrder: 0,
    addedAt: new Date(),
    globalCard: mockGlobalCard,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: CardsRepository,
          useValue: {
            findGlobalCardByFront: jest.fn(),
            createGlobalCard: jest.fn(),
            findGlobalCardById: jest.fn(),
            mappingExists: jest.fn(),
            createMapping: jest.fn(),
            deleteMapping: jest.fn(),
            findMappingsByDeck: jest.fn(),
            countMappingsByGlobalCard: jest.fn(),
            updateGlobalCard: jest.fn(),
          },
        },
        {
          provide: CardMapper,
          useValue: {
            toResponseDto: jest
              .fn()
              .mockImplementation(<T>(card: T) => ({ ...card })),
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
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: DeepSeekClient,
          useValue: { chat: jest.fn() },
        },
        {
          provide: GoogleTtsClient,
          useValue: { synthesize: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: { upload: jest.fn() },
        },

        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          },
        },
        {
          provide: WordValidatorClient,
          useValue: {
            validateWord: jest.fn().mockResolvedValue({ isValid: true }),
          },
        },
        {
          provide: UploadFileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteFileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FileManagerRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByRef: jest.fn(),
            findByUserId: jest.fn().mockResolvedValue([]),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CardsService);
    repository = module.get(CardsRepository);
    decksRepository = module.get(DecksRepository);
    cacheManager = module.get('ICacheManager');
    eventEmitter = module.get(EventEmitter2);
    deepSeekClient = module.get(DeepSeekClient);
    storageService = module.get(StorageService);
    logger = module.get(LoggerService);
    uploadFileUseCase = module.get(UploadFileUseCase);
  });

  describe('createCardManual', () => {
    const dto: CreateCardDto = { front: 'apple', back: 'quả táo' };

    it('should throw DECK_NOT_OWNED if deck not found', async () => {
      decksRepository.findById.mockResolvedValue(null);
      await expect(
        service.createCardManual('user1', 'deck1', dto),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw DECK_NOT_OWNED if not owner', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      await expect(
        service.createCardManual('otherUser', 'deck1', dto),
      ).rejects.toThrow(BusinessException);
    });

    it('should create new GlobalCard if not exists', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      repository.findGlobalCardByFront.mockResolvedValue(null);
      repository.createGlobalCard.mockResolvedValue(mockGlobalCard as any);
      repository.mappingExists.mockResolvedValue(false);
      repository.createMapping.mockResolvedValue({} as any);

      const result = await service.createCardManual('user1', 'deck1', dto);

      expect(repository.createGlobalCard).toHaveBeenCalledWith({
        front: 'apple',
        back: 'quả táo',
        extras: {},
        status: 'completed',
        validated: true,
        valid: true,
      });
      expect(repository.createMapping).toHaveBeenCalled();
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
      expect(result.front).toBe('apple');
    });

    it('should reuse existing GlobalCard if front already exists', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      repository.findGlobalCardByFront.mockResolvedValue(mockGlobalCard as any);
      repository.mappingExists.mockResolvedValue(false);

      await service.createCardManual('user1', 'deck1', dto);

      expect(repository.createGlobalCard).not.toHaveBeenCalled();
      expect(repository.createMapping).toHaveBeenCalled();
    });

    it('should throw CARD_ALREADY_IN_DECK if mapping exists', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      repository.findGlobalCardByFront.mockResolvedValue(mockGlobalCard as any);
      repository.mappingExists.mockResolvedValue(true);

      await expect(
        service.createCardManual('user1', 'deck1', dto),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('updateGlobalCard', () => {
    const dto: UpdateCardDto = { front: 'updated', back: 'đã cập nhật' };

    it('should throw CARD_NOT_FOUND if card missing', async () => {
      repository.findGlobalCardById.mockResolvedValue(null);
      await expect(
        service.updateGlobalCard('user1', 'card1', dto),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw CARD_NOT_IN_ANY_DECK if no mappings', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.countMappingsByGlobalCard.mockResolvedValue(0);
      await expect(
        service.updateGlobalCard('user1', 'card1', dto),
      ).rejects.toThrow(BusinessException);
    });

    it('should update card and emit event', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.countMappingsByGlobalCard.mockResolvedValue(1);
      repository.updateGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        front: 'updated',
        back: 'đã cập nhật',
      } as any);

      const result = await service.updateGlobalCard('user1', 'card1', dto);

      expect(repository.updateGlobalCard).toHaveBeenCalledWith('card1', {
        front: 'updated',
        back: 'đã cập nhật',
        status: 'completed',
      });
      expect(cacheManager.del).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.updated', {
        cardId: 'card1',
        userId: 'user1',
      });
      expect(result.front).toBe('updated');
    });

    it('should invalidate meaning:front and audio:front when front changes', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.countMappingsByGlobalCard.mockResolvedValue(1);
      repository.updateGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        front: 'updated',
        back: 'đã cập nhật',
      } as any);

      await service.updateGlobalCard('user1', 'card1', dto);

      // Should delete old cache keys
      expect(cacheManager.del).toHaveBeenCalledWith('meaning:apple');
      expect(cacheManager.del).toHaveBeenCalledWith('audio:apple');
      expect(cacheManager.del).toHaveBeenCalledWith('card:front:apple');
      // Should set new cache key
      expect(cacheManager.set).toHaveBeenCalledWith(
        'card:front:updated',
        expect.any(Object),
        86400,
      );
    });

    it('should invalidate meaning:front when back changes', async () => {
      const backDto: UpdateCardDto = { back: 'nghĩa mới' };
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.countMappingsByGlobalCard.mockResolvedValue(1);
      repository.updateGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        back: 'nghĩa mới',
      } as any);

      await service.updateGlobalCard('user1', 'card1', backDto);

      // Should delete meaning cache for the front
      expect(cacheManager.del).toHaveBeenCalledWith('meaning:apple');
    });

    it('should allow updating imageUrl and audioUrl via PATCH', async () => {
      const mediaDto: UpdateCardDto = {
        imageUrl: 'https://example.com/new-image.jpg',
        audioUrl: 'https://example.com/new-audio.mp3',
      };
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.countMappingsByGlobalCard.mockResolvedValue(1);
      repository.updateGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        imageUrl: 'https://example.com/new-image.jpg',
        audioUrl: 'https://example.com/new-audio.mp3',
      } as any);

      const result = await service.updateGlobalCard('user1', 'card1', mediaDto);

      expect(repository.updateGlobalCard).toHaveBeenCalledWith('card1', {
        imageUrl: 'https://example.com/new-image.jpg',
        audioUrl: 'https://example.com/new-audio.mp3',
      });
      expect(result.imageUrl).toBe('https://example.com/new-image.jpg');
      expect(result.audioUrl).toBe('https://example.com/new-audio.mp3');
    });
  });

  describe('findCardsByDeck', () => {
    it('should throw DECK_NOT_FOUND if deck missing', async () => {
      decksRepository.findById.mockResolvedValue(null);
      await expect(
        service.findCardsByDeck('user1', 'deck1', {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw DECK_PRIVATE if private and not owner', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      await expect(
        service.findCardsByDeck('otherUser', 'deck1', {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should return cached result if exists', async () => {
      decksRepository.findById.mockResolvedValue({
        ...mockDeck,
        visibility: 'PUBLIC',
      } as any);
      const cachedResult = { data: [mockGlobalCard], total: 1 };
      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findCardsByDeck('otherUser', 'deck1', {
        page: 1,
        limit: 20,
      });

      expect(repository.findMappingsByDeck).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should fetch from repository and cache result', async () => {
      decksRepository.findById.mockResolvedValue({
        ...mockDeck,
        visibility: 'PUBLIC',
      } as any);
      cacheManager.get.mockResolvedValue(null);
      repository.findMappingsByDeck.mockResolvedValue({
        mappings: [mockMapping as any],
        total: 1,
      });

      const result = await service.findCardsByDeck('otherUser', 'deck1', {
        page: 1,
        limit: 20,
      });

      expect(repository.findMappingsByDeck).toHaveBeenCalledWith(
        'deck1',
        1,
        20,
        undefined,
      );
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findGlobalCardById', () => {
    it('should return cached card if exists', async () => {
      cacheManager.get.mockResolvedValue(mockGlobalCard);
      const result = await service.findGlobalCardById('card1');
      expect(repository.findGlobalCardById).not.toHaveBeenCalled();
      expect(result).toEqual(mockGlobalCard);
    });

    it('should throw CARD_NOT_FOUND if missing', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findGlobalCardById.mockResolvedValue(null);
      await expect(service.findGlobalCardById('missing')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should fetch and cache card', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      const result = await service.findGlobalCardById('card1');
      expect(repository.findGlobalCardById).toHaveBeenCalledWith('card1');
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.front).toBe('apple');
    });
  });

  describe('deleteCardFromDeck', () => {
    it('should throw DECK_NOT_OWNED if not owner', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      await expect(
        service.deleteCardFromDeck('otherUser', 'deck1', 'card1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should delete mapping and decrement totalCards', async () => {
      decksRepository.findById.mockResolvedValue(mockDeck as any);
      repository.deleteMapping.mockResolvedValue();

      await service.deleteCardFromDeck('user1', 'deck1', 'card1');

      expect(repository.deleteMapping).toHaveBeenCalledWith('deck1', 'card1');
      expect(decksRepository.incrementTotalCards).toHaveBeenCalledWith(
        'deck1',
        -1,
      );
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.deleted', {
        cardId: 'card1',
        deckId: 'deck1',
        userId: 'user1',
      });
    });
  });

  describe('uploadImage', () => {
    it('should throw CARD_NOT_FOUND if card missing', async () => {
      repository.findGlobalCardById.mockResolvedValue(null);
      await expect(
        service.uploadImage(
          'user1',
          'card1',
          Buffer.from(''),
          'test.jpg',
          'image/jpeg',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should upload image and update card', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      uploadFileUseCase.execute.mockResolvedValue({
        id: 'file-1',
        url: 'https://example.com/image.jpg',
        publicId: 'img1',
        resourceType: 'image',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        createdAt: new Date(),
      } as any);
      repository.updateGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        imageUrl: 'https://example.com/image.jpg',
      } as any);

      const result = await service.uploadImage(
        'user1',
        'card1',
        Buffer.from(''),
        'test.jpg',
        'image/jpeg',
      );

      expect(uploadFileUseCase.execute).toHaveBeenCalled();
      expect(repository.updateGlobalCard).toHaveBeenCalledWith('card1', {
        imageUrl: 'https://example.com/image.jpg',
      });
      expect(cacheManager.del).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.updated', {
        cardId: 'card1',
        userId: 'user1',
      });
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('deleteImage', () => {
    it('should set imageUrl to null', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.updateGlobalCard.mockResolvedValue(mockGlobalCard as any);

      await service.deleteImage('user1', 'card1');

      expect(repository.updateGlobalCard).toHaveBeenCalledWith('card1', {
        imageUrl: null,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.updated', {
        cardId: 'card1',
        userId: 'user1',
      });
    });
  });

  describe('uploadAudio', () => {
    it('should upload audio and update card', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      uploadFileUseCase.execute.mockResolvedValue({
        id: 'file-2',
        url: 'https://example.com/audio.mp3',
        publicId: 'aud1',
        resourceType: 'audio',
        mimeType: 'audio/mpeg',
        sizeBytes: 5000,
        createdAt: new Date(),
      } as any);
      repository.updateGlobalCard.mockResolvedValue({
        ...mockGlobalCard,
        audioUrl: 'https://example.com/audio.mp3',
      } as any);

      const result = await service.uploadAudio(
        'user1',
        'card1',
        Buffer.from(''),
        'test.mp3',
        'audio/mpeg',
      );

      expect(uploadFileUseCase.execute).toHaveBeenCalled();
      expect(repository.updateGlobalCard).toHaveBeenCalledWith('card1', {
        audioUrl: 'https://example.com/audio.mp3',
      });
      expect(result.audioUrl).toBe('https://example.com/audio.mp3');
    });
  });

  describe('deleteAudio', () => {
    it('should set audioUrl to null', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      repository.updateGlobalCard.mockResolvedValue(mockGlobalCard as any);

      await service.deleteAudio('user1', 'card1');

      expect(repository.updateGlobalCard).toHaveBeenCalledWith('card1', {
        audioUrl: null,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('card.updated', {
        cardId: 'card1',
        userId: 'user1',
      });
    });
  });

  describe('generateAiHint', () => {
    it('should throw CARD_NOT_FOUND if card missing', async () => {
      repository.findGlobalCardById.mockResolvedValue(null);
      await expect(service.generateAiHint('card1')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should return AI hint from DeepSeek', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      deepSeekClient.chat.mockResolvedValue('Think of an apple a day!');

      const result = await service.generateAiHint('card1');

      expect(deepSeekClient.chat).toHaveBeenCalled();
      expect(result.hint).toBe('Think of an apple a day!');
    });

    it('should return fallback hint if DeepSeek fails', async () => {
      repository.findGlobalCardById.mockResolvedValue(mockGlobalCard as any);
      deepSeekClient.chat.mockRejectedValue(new Error('API error'));

      const result = await service.generateAiHint('card1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result.hint).toContain('apple');
    });
  });
});
