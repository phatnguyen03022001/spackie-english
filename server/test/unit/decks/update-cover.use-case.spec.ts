import { Test, TestingModule } from '@nestjs/testing';
import { UpdateCoverUseCase } from '@modules/decks/use-cases/update-cover.use-case';
import { DecksRepository } from '@modules/decks/decks.repository';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';

describe('UpdateCoverUseCase', () => {
  let useCase: UpdateCoverUseCase;
  let repository: jest.Mocked<DecksRepository>;
  let mapper: jest.Mocked<DeckMapper>;
  let storageService: jest.Mocked<StorageService>;
  let cacheManager: jest.Mocked<ICacheManager>;

  const mockDeck = {
    id: 'deck1',
    userId: 'user1',
    title: 'Test Deck',
    coverUrl: 'https://example.com/upload/v12345/old-cover.jpg',
    visibility: 'PRIVATE',
    totalCards: 0,
  };

  const mockResponseDto = {
    id: 'deck1',
    title: 'Test Deck',
    coverUrl: 'https://example.com/new-cover.jpg',
  };

  const fileBuffer = Buffer.from('fake-image-data');
  const originalName = 'cover.jpg';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateCoverUseCase,
        {
          provide: DecksRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: DeckMapper,
          useValue: {
            toResponseDto: jest.fn().mockReturnValue(mockResponseDto),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'ICacheManager',
          useValue: {
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateCoverUseCase);
    repository = module.get(DecksRepository);
    mapper = module.get(DeckMapper);
    storageService = module.get(StorageService);
    cacheManager = module.get('ICacheManager');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should throw DECK_NOT_OWNED if deck not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('user1', 'deck1', fileBuffer, originalName),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw DECK_NOT_OWNED if not owner', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);

      await expect(
        useCase.execute('otherUser', 'deck1', fileBuffer, originalName),
      ).rejects.toThrow(BusinessException);
    });

    it('should upload new cover, delete old cover, update deck, invalidate cache', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);
      storageService.upload.mockResolvedValue({
        url: 'https://example.com/new-cover.jpg',
        publicId: 'deck-covers/new-cover',
        format: 'jpg',
        size: 5000,
      });
      storageService.delete.mockResolvedValue();
      repository.update.mockResolvedValue({
        ...mockDeck,
        coverUrl: 'https://example.com/new-cover.jpg',
      } as any);

      const result = await useCase.execute(
        'user1',
        'deck1',
        fileBuffer,
        originalName,
      );

      expect(storageService.upload).toHaveBeenCalledWith(
        fileBuffer,
        originalName,
        { folder: 'deck-covers' },
      );
      expect(storageService.delete).toHaveBeenCalledWith('old-cover');
      expect(repository.update).toHaveBeenCalledWith('deck1', {
        coverUrl: 'https://example.com/new-cover.jpg',
      });
      expect(cacheManager.del).toHaveBeenCalledWith('decks:deck:deck1');
      expect(mapper.toResponseDto).toHaveBeenCalled();
      expect(result).toEqual(mockResponseDto);
    });

    it('should not delete old cover if deck has no coverUrl', async () => {
      repository.findById.mockResolvedValue({
        ...mockDeck,
        coverUrl: null,
      } as any);
      storageService.upload.mockResolvedValue({
        url: 'https://example.com/new-cover.jpg',
        publicId: 'deck-covers/new-cover',
        format: 'jpg',
        size: 5000,
      });
      repository.update.mockResolvedValue({
        ...mockDeck,
        coverUrl: 'https://example.com/new-cover.jpg',
      } as any);

      await useCase.execute('user1', 'deck1', fileBuffer, originalName);

      expect(storageService.delete).not.toHaveBeenCalled();
    });

    it('should not fail if deleting old cover throws error', async () => {
      repository.findById.mockResolvedValue(mockDeck as any);
      storageService.upload.mockResolvedValue({
        url: 'https://example.com/new-cover.jpg',
        publicId: 'deck-covers/new-cover',
        format: 'jpg',
        size: 5000,
      });
      storageService.delete.mockRejectedValue(new Error('Delete failed'));
      repository.update.mockResolvedValue({
        ...mockDeck,
        coverUrl: 'https://example.com/new-cover.jpg',
      } as any);

      await expect(
        useCase.execute('user1', 'deck1', fileBuffer, originalName),
      ).resolves.not.toThrow();
      expect(storageService.delete).toHaveBeenCalled();
    });

    it('should not delete old cover if publicId cannot be extracted', async () => {
      repository.findById.mockResolvedValue({
        ...mockDeck,
        coverUrl: 'https://example.com/invalid-url',
      } as any);
      storageService.upload.mockResolvedValue({
        url: 'https://example.com/new-cover.jpg',
        publicId: 'deck-covers/new-cover',
        format: 'jpg',
        size: 5000,
      });
      repository.update.mockResolvedValue({
        ...mockDeck,
        coverUrl: 'https://example.com/new-cover.jpg',
      } as any);

      await useCase.execute('user1', 'deck1', fileBuffer, originalName);

      expect(storageService.delete).not.toHaveBeenCalled();
    });
  });
});
