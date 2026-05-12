import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from '@modules/statistics/statistics.service';
import { PrismaService } from '@database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    cardProgress: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    listeningPractice: {
      findMany: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: 'ICacheManager',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
            reset: jest.fn(),
            ping: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(StatisticsService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard stats with totalMastered calculated correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totalCardsLearned: 50,
        currentStreak: 5,
        longestStreak: 10,
      });

      mockPrisma.cardProgress.findMany
        .mockResolvedValueOnce([{ reviewCount: 3 }, { reviewCount: 5 }]) // review counts
        .mockResolvedValueOnce([{ globalCardId: 'c1' }, { globalCardId: 'c2' }]) // mastered cards
        .mockResolvedValueOnce([{ lastReviewAt: new Date() }]) // recent reviews
        .mockResolvedValueOnce([]); // empty for listening

      mockPrisma.listeningPractice.findMany.mockResolvedValue([
        { accuracy: 90, duration: 30000, createdAt: new Date() },
        { accuracy: 80, duration: 45000, createdAt: new Date() },
      ]);

      const result = await service.getDashboard('user1');

      expect(result.totalCardsLearned).toBe(50);
      expect(result.totalReviews).toBe(8);
      expect(result.totalMastered).toBe(2);
      expect(result.totalListeningPractices).toBe(2);
      expect(result.averageAccuracy).toBe(85);
      expect(result.totalStudyTime).toBe(75000);
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
      expect(result.dailyActivity).toBeDefined();
      expect(result.dailyActivity.length).toBe(7);
    });

    it('should handle empty data gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.cardProgress.findMany.mockResolvedValue([]);
      mockPrisma.listeningPractice.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('user1');

      expect(result.totalCardsLearned).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.totalMastered).toBe(0);
      expect(result.totalListeningPractices).toBe(0);
      expect(result.averageAccuracy).toBe(0);
      expect(result.totalStudyTime).toBe(0);
    });
  });

  describe('getAdminOverview', () => {
    it('should return admin overview stats', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(100); // totalUsers
      mockPrisma.subscription.count.mockResolvedValue(25); // activeSubscriptions
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: 5000000 },
      });
      mockPrisma.user.count.mockResolvedValueOnce(10); // recentSignups

      const result = await service.getAdminOverview();

      expect(result.totalUsers).toBe(100);
      expect(result.activeSubscriptions).toBe(25);
      expect(result.totalRevenue).toBe(5000000);
      expect(result.recentSignups).toBe(10);
    });
  });

  describe('getVideoStats', () => {
    it('should return video stats aggregate', async () => {
      mockPrisma.listeningPractice.findMany.mockResolvedValue([
        {
          youtubeId: 'dQw4w9WgXcQ',
          duration: 60000,
          createdAt: new Date('2026-05-11'),
        },
        {
          youtubeId: 'dQw4w9WgXcQ',
          duration: 30000,
          createdAt: new Date('2026-05-12'),
        },
      ]);

      const result = await service.getVideoStats('user1');

      expect(result.weekly).toBeDefined();
      expect(result.monthly).toBeDefined();
      expect(result.allTime).toBeDefined();
      expect(result.allTime.uniqueVideos).toBe(1);
      expect(result.allTime.totalDurationSec).toBe(90000);
    });

    it('should return empty stats when no YouTube practices', async () => {
      mockPrisma.listeningPractice.findMany.mockResolvedValue([]);

      const result = await service.getVideoStats('user1');

      expect(result.weekly).toHaveLength(0);
      expect(result.monthly).toHaveLength(0);
      expect(result.allTime.uniqueVideos).toBe(0);
      expect(result.allTime.totalDurationSec).toBe(0);
    });
  });

  describe('handleCardReviewed', () => {
    it('should update user stats on card reviewed event', async () => {
      mockPrisma.user.update.mockResolvedValue({} as any);

      await service.handleCardReviewed({
        userId: 'user1',
        globalCardId: 'card1',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          totalCardsLearned: { increment: 1 },
          lastStudiedAt: expect.any(Date),
        },
      });
    });
  });

  describe('handleListeningCompleted', () => {
    it('should update lastStudiedAt on listening completed event', async () => {
      mockPrisma.user.update.mockResolvedValue({} as any);

      await service.handleListeningCompleted({
        userId: 'user1',
        practiceId: 'practice1',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { lastStudiedAt: expect.any(Date) },
      });
    });
  });
});
