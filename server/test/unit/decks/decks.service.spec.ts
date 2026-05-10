import { Test, TestingModule } from '@nestjs/testing';
import { DecksService } from '@modules/decks/decks.service';
import { DecksRepository } from '@modules/decks/decks.repository';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from '@common/filters/business.exception';
import { HttpStatus } from '@nestjs/common';
import { CreateDeckDto } from '@modules/decks/dto/create-deck.dto';
import { UpdateDeckDto } from '@modules/decks/dto/update-deck.dto';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';
import { StorageService } from '@infrastructure/storage/storage.service';

describe('DecksService', () => {
  let service: DecksService;
  let repository: jest.Mocked<DecksRepository>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let storageService: jest.Mocked<StorageService>;

  const mockDeck = {
    id: 'deck1',
    userId: 'user1',
    title: 'My deck',
    description: 'test',
    coverUrl: null,
    visibility: 'PRIVATE' as const,
    tags: [],
    isVipOnly: false,
    totalCards: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPublicDeck = {
    ...mockDeck,
    id: 'deck2',
    visibility: 'PUBLIC' as const,
  };

  const mockVipDeck = {
    ...mockDeck,
    id: 'deck3',
    visibility: 'PUBLIC' as const,
    isVipOnly: true,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findOwnDecks: jest.fn(),
      findPublicDecks: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      deleteMappings: jest.fn(),
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
    const mockEventEmitter = { emit: jest.fn() };
    const mockStorageService = {
      upload: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    const mockMapper = {
      toResponseDto: jest
        .fn()
        .mockImplementation((d: Record<string, unknown>) => ({ ...d })),
      toResponseDtoList: jest
        .fn()
        .mockImplementation((list: Record<string, unknown>[]) =>
          list.map((d) => ({ ...d })),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: DecksRepository, useValue: mockRepository },
        { provide: DeckMapper, useValue: mockMapper },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get(DecksService);
    repository = module.get(DecksRepository);
    cacheManager = module.get('ICacheManager');
    eventEmitter = module.get(EventEmitter2);
    storageService = module.get(StorageService);
  });

  describe('create', () => {
    it('should create deck and invalidate cache and emit event', async () => {
      const dto: CreateDeckDto = { title: 'New deck' };
      repository.create.mockResolvedValue(mockDeck as any);

      const result = await service.create('user1', dto);

      expect(repository.create).toHaveBeenCalledWith({
        title: 'New deck',
        description: undefined,
        visibility: undefined,
        tags: [],
        isVipOnly: false,
        user: { connect: { id: 'user1' } },
      });
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('deck.created', {
        deckId: 'deck1',
        userId: 'user1',
      });
      expect(result.title).toBe('My deck');
    });
  });

  describe('findById', () => {
    it('should return cached deck if exists', async () => {
      cacheManager.get.mockResolvedValue(mockDeck as any);
      const result = await service.findById('deck1', 'user1');
      expect(result).toEqual(mockDeck);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should throw DECK_NOT_FOUND if deck missing', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('missing', 'user1')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.findById('missing', 'user1')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should throw DECK_PRIVATE if private and not owner', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockDeck as any);

      await expect(service.findById('deck1', 'otherUser')).rejects.toThrow(
        BusinessException,
      );
      await expect(
        service.findById('deck1', 'otherUser'),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('should throw DECK_VIP_ONLY if vip and not owner', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockVipDeck as any);

      await expect(service.findById('deck3', 'otherUser')).rejects.toThrow(
        BusinessException,
      );
      await expect(
        service.findById('deck3', 'otherUser'),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('should return deck if public even for non-owner', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockPublicDeck as any);

      const result = await service.findById('deck2', 'otherUser');
      expect(result.visibility).toBe('PUBLIC');
    });

    it('should cache the result after fetching', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockDeck as any);

      await service.findById('deck1', 'user1');
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('findOwnDecks', () => {
    it('should return cached result if exists', async () => {
      const cachedResult = { data: [mockDeck], total: 1 };
      cacheManager.get.mockResolvedValue(cachedResult);

      const query: DeckListQueryDto = {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      };
      const result = await service.findOwnDecks('user1', query);

      expect(result).toEqual(cachedResult);
      expect(repository.findOwnDecks).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache result', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findOwnDecks.mockResolvedValue({
        decks: [mockDeck as any],
        total: 1,
      });

      const query: DeckListQueryDto = {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      };
      const result = await service.findOwnDecks('user1', query);

      expect(repository.findOwnDecks).toHaveBeenCalledWith('user1', query);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findPublicDecks', () => {
    it('should return cached result if exists', async () => {
      const cachedResult = { data: [mockPublicDeck], total: 1 };
      cacheManager.get.mockResolvedValue(cachedResult);

      const query: DeckListQueryDto = {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      };
      const result = await service.findPublicDecks(query);

      expect(result).toEqual(cachedResult);
      expect(repository.findPublicDecks).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache result', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findPublicDecks.mockResolvedValue({
        decks: [mockPublicDeck as any],
        total: 1,
      });

      const query: DeckListQueryDto = {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      };
      const result = await service.findPublicDecks(query);

      expect(repository.findPublicDecks).toHaveBeenCalledWith(query);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should throw DECK_NOT_OWNED if not owner', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);

      await expect(
        service.update('otherUser', 'deck1', { title: 'Hacked' }),
      ).rejects.toThrow(BusinessException);
    });

    it('should update deck and invalidate cache', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);
      repository.update.mockResolvedValue({
        ...mockDeck,
        title: 'Updated title',
      } as any);

      const dto: UpdateDeckDto = { title: 'Updated title' };
      const result = await service.update('user1', 'deck1', dto);

      expect(repository.update).toHaveBeenCalledWith('deck1', dto);
      expect(cacheManager.del).toHaveBeenCalled();
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('deck.updated', {
        deckId: 'deck1',
        userId: 'user1',
      });
      expect(result.title).toBe('Updated title');
    });
  });

  describe('delete', () => {
    it('should throw DECK_NOT_OWNED if not owner', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);

      await expect(service.delete('otherUser', 'deck1')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should delete mappings, soft delete and invalidate caches', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);
      repository.softDelete.mockResolvedValue({} as any);

      await service.delete('user1', 'deck1');

      expect(repository.deleteMappings).toHaveBeenCalledWith('deck1');
      expect(repository.softDelete).toHaveBeenCalledWith('deck1');
      expect(cacheManager.del).toHaveBeenCalled();
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('deck.deleted', {
        deckId: 'deck1',
        userId: 'user1',
      });
    });
  });

  describe('deleteCover', () => {
    it('should throw DECK_NOT_OWNED if not owner', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);

      await expect(service.deleteCover('otherUser', 'deck1')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should delete cover and update deck', async () => {
      const deckWithCover = {
        ...mockDeck,
        coverUrl: 'https://example.com/upload/v12345/deck-covers/abc123.jpg',
      };
      repository.findById.mockResolvedValue(deckWithCover as any);
      repository.update.mockResolvedValue({
        ...deckWithCover,
        coverUrl: null,
      } as any);

      const result = await service.deleteCover('user1', 'deck1');

      expect(storageService.delete).toHaveBeenCalledWith('deck-covers/abc123');
      expect(repository.update).toHaveBeenCalledWith('deck1', {
        coverUrl: null,
      });
      expect(cacheManager.del).toHaveBeenCalled();
      expect(result.coverUrl).toBeNull();
    });

    it('should skip storage delete if no coverUrl', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);
      repository.update.mockResolvedValue(mockDeck as any);

      await service.deleteCover('user1', 'deck1');

      expect(storageService.delete).not.toHaveBeenCalled();
    });
  });
});
