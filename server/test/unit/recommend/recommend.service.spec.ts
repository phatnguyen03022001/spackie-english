// test/unit/recommend/recommend.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendService } from '@modules/recommend/recommend.service';
import { PrismaService } from '@database/prisma.service';

describe('RecommendService', () => {
  let service: RecommendService;
  let prisma: jest.Mocked<PrismaService>;
  let cacheManager: any;

  const mockPrisma = {
    deck: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cardProgress: {
      findMany: jest.fn(),
    },
    listeningPractice: {
      findMany: jest.fn(),
    },
    globalCard: {
      findMany: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'ICacheManager', useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get(RecommendService);
    prisma = module.get(PrismaService);
    cacheManager = module.get('ICacheManager');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recommendDecks', () => {
    const userId = 'user-1';

    it('should return cached data if available', async () => {
      const cached = { data: [{ id: 'deck-1' }], total: 1 };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.recommendDecks(userId, 1, 10);

      expect(result).toEqual(cached);
      expect(prisma.deck.findMany).not.toHaveBeenCalled();
    });

    it('should recommend based on user tags if user has decks', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.deck.findMany
        // First call: get user's decks for tags
        .mockResolvedValueOnce([
          { tags: ['english', 'grammar'] },
          { tags: ['vocabulary'] },
        ])
        // Second call: find public decks with overlapping tags
        .mockResolvedValueOnce([
          {
            id: 'deck-2',
            title: 'English Grammar',
            description: 'Learn grammar',
            coverUrl: null,
            tags: ['english'],
            totalCards: 50,
            user: { displayName: 'Teacher', username: 'teacher1' },
          },
        ]);
      mockPrisma.deck.count.mockResolvedValueOnce(1);

      const result = await service.recommendDecks(userId, 1, 10);

      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('English Grammar');
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should fallback to popular decks if user has no tags', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.deck.findMany
        // First call: get user's decks (empty tags)
        .mockResolvedValueOnce([{ tags: [] }])
        // Second call: popular fallback
        .mockResolvedValueOnce([
          {
            id: 'deck-popular',
            title: 'Popular Deck',
            totalCards: 100,
            user: { displayName: 'Popular', username: 'pop' },
          },
        ]);
      mockPrisma.deck.count.mockResolvedValueOnce(1);

      const result = await service.recommendDecks(userId, 1, 10);

      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('Popular Deck');
    });
  });

  describe('recommendReview', () => {
    it('should return cached data if available', async () => {
      const cached = [{ cardId: 'card-1', front: 'hello' }];
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.recommendReview('user-1', 10);

      expect(result).toEqual(cached);
      expect(prisma.cardProgress.findMany).not.toHaveBeenCalled();
    });

    it('should return due cards sorted by easeFactor', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.cardProgress.findMany.mockResolvedValue([
        {
          id: 'cp-1',
          easeFactor: 1.5,
          interval: 1,
          repetitions: 2,
          dueDate: new Date(),
          globalCard: {
            id: 'card-1',
            front: 'hello',
            back: 'xin chào',
            imageUrl: null,
          },
        },
      ]);

      const result = await service.recommendReview('user-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].cardId).toBe('card-1');
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('recommendWeakWords', () => {
    it('should return cached data if available', async () => {
      const cached = [{ cardId: 'card-1', reason: 'stuck' }];
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.recommendWeakWords('user-1');

      expect(result).toEqual(cached);
    });

    it('should find stuck cards with low intervals', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.listeningPractice.findMany.mockResolvedValue([]);
      mockPrisma.cardProgress.findMany.mockResolvedValue([
        {
          id: 'cp-1',
          easeFactor: 1.3,
          interval: 1,
          repetitions: 5,
          dueDate: new Date(),
          globalCard: {
            id: 'card-1',
            front: 'hello',
            back: 'xin chào',
            imageUrl: null,
          },
        },
      ]);

      const result = await service.recommendWeakWords('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe('stuck');
    });
  });

  describe('invalidateCache', () => {
    it('should clear pattern for specific user', async () => {
      await service.invalidateCache('user-1');
      expect(cacheManager.delPattern).toHaveBeenCalledWith(
        'recommend:*:user-1:*',
      );
    });

    it('should clear all recommendation caches', async () => {
      await service.invalidateCache();
      expect(cacheManager.delPattern).toHaveBeenCalledWith('recommend:*');
    });
  });
});
