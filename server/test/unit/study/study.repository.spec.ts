import { Test, TestingModule } from '@nestjs/testing';
import { StudyRepository } from '@modules/study/study.repository';
import { PrismaService } from '@database/prisma.service';

describe('StudyRepository', () => {
  let repository: StudyRepository;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    cardProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(StudyRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findCardProgress', () => {
    it('should find card progress by userId and globalCardId', async () => {
      const expected = {
        userId: 'user1',
        globalCardId: 'card1',
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
      };
      mockPrisma.cardProgress.findUnique.mockResolvedValue(expected);

      const result = await repository.findCardProgress('user1', 'card1');

      expect(mockPrisma.cardProgress.findUnique).toHaveBeenCalledWith({
        where: {
          userId_globalCardId: { userId: 'user1', globalCardId: 'card1' },
        },
      });
      expect(result).toEqual(expected);
    });

    it('should return null if not found', async () => {
      mockPrisma.cardProgress.findUnique.mockResolvedValue(null);
      const result = await repository.findCardProgress('user1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('upsertCardProgress', () => {
    it('should upsert card progress', async () => {
      const data = {
        easeFactor: 2.6,
        interval: 1,
        repetitions: 1,
        dueDate: new Date(),
        lastRating: 'GOOD' as const,
        reviewCount: 1,
        recentReviews: [],
        lastReviewAt: new Date(),
      };
      const expected = { userId: 'user1', globalCardId: 'card1', ...data };
      mockPrisma.cardProgress.upsert.mockResolvedValue(expected);

      const result = await repository.upsertCardProgress(
        'user1',
        'card1',
        data,
      );

      expect(mockPrisma.cardProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_globalCardId: { userId: 'user1', globalCardId: 'card1' },
        },
        create: expect.objectContaining({
          userId: 'user1',
          globalCardId: 'card1',
          easeFactor: 2.6,
          interval: 1,
        }),
        update: expect.objectContaining({
          easeFactor: 2.6,
          interval: 1,
        }),
      });
      expect(result).toEqual(expected);
    });
  });

  describe('countDueCards', () => {
    it('should count due cards for user', async () => {
      mockPrisma.cardProgress.count.mockResolvedValue(5);

      const result = await repository.countDueCards('user1');

      expect(mockPrisma.cardProgress.count).toHaveBeenCalledWith({
        where: { userId: 'user1', dueDate: { lte: expect.any(Date) } },
      });
      expect(result).toBe(5);
    });

    it('should count due cards with deck filter', async () => {
      mockPrisma.cardProgress.count.mockResolvedValue(3);

      const result = await repository.countDueCards('user1', 'deck1');

      expect(mockPrisma.cardProgress.count).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          dueDate: { lte: expect.any(Date) },
          globalCard: { deckMappings: { some: { deckId: 'deck1' } } },
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('findDueCards', () => {
    it('should return due cards with global card info', async () => {
      const items = [
        {
          userId: 'user1',
          globalCardId: 'card1',
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          dueDate: new Date(),
          lastRating: null,
          reviewCount: 0,
          recentReviews: [],
          lastReviewAt: null,
          globalCard: {
            id: 'card1',
            front: 'apple',
            back: 'quả táo',
            imageUrl: null,
            audioUrl: null,
            extras: {},
          },
        },
      ];
      mockPrisma.cardProgress.findMany.mockResolvedValue(items);
      mockPrisma.cardProgress.count.mockResolvedValue(1);

      const result = await repository.findDueCards('user1', 0, 20);

      expect(mockPrisma.cardProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', dueDate: { lte: expect.any(Date) } },
        skip: 0,
        take: 20,
        orderBy: { dueDate: 'asc' },
        include: {
          globalCard: {
            select: {
              id: true,
              front: true,
              back: true,
              imageUrl: true,
              audioUrl: true,
              extras: true,
            },
          },
        },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by deckId', async () => {
      mockPrisma.cardProgress.findMany.mockResolvedValue([]);
      mockPrisma.cardProgress.count.mockResolvedValue(0);

      await repository.findDueCards('user1', 0, 20, 'deck1');

      expect(mockPrisma.cardProgress.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          dueDate: { lte: expect.any(Date) },
          globalCard: { deckMappings: { some: { deckId: 'deck1' } } },
        },
        skip: 0,
        take: 20,
        orderBy: { dueDate: 'asc' },
        include: {
          globalCard: {
            select: {
              id: true,
              front: true,
              back: true,
              imageUrl: true,
              audioUrl: true,
              extras: true,
            },
          },
        },
      });
    });
  });

  describe('updateUserStreak', () => {
    it('should update user streak fields', async () => {
      mockPrisma.user.update.mockResolvedValue({} as any);

      await repository.updateUserStreak('user1', 3, 5);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          currentStreak: 3,
          longestStreak: 5,
          lastStudiedAt: expect.any(Date),
          totalCardsLearned: { increment: 1 },
        },
      });
    });
  });

  describe('getUserStreak', () => {
    it('should return user streak info', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        currentStreak: 3,
        longestStreak: 5,
        lastStudiedAt: new Date(),
      });

      const result = await repository.getUserStreak('user1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastStudiedAt: true,
        },
      });
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(5);
    });

    it('should return defaults if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.getUserStreak('user1');

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastStudiedAt).toBeNull();
    });
  });
});
