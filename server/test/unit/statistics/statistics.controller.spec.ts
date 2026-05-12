import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from '@modules/statistics/statistics.controller';
import { StatisticsService } from '@modules/statistics/statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: jest.Mocked<StatisticsService>;

  beforeEach(async () => {
    const mockService = {
      getDashboard: jest.fn(),
      getVideoStats: jest.fn(),
      getAdminOverview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: mockService }],
    }).compile();

    controller = module.get(StatisticsController);
    service = module.get(StatisticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should call service.getDashboard with userId', async () => {
      const expectedResult = {
        totalCardsLearned: 50,
        totalReviews: 100,
        totalMastered: 20,
        totalListeningPractices: 10,
        currentStreak: 5,
        longestStreak: 10,
        averageAccuracy: 85,
        totalStudyTime: 3600000,
        dailyActivity: [],
      };
      service.getDashboard.mockResolvedValue(expectedResult);

      const result = await controller.getDashboard('user1');

      expect(service.getDashboard).toHaveBeenCalledWith('user1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getVideoStats', () => {
    it('should call service.getVideoStats with userId', async () => {
      const expectedResult = {
        weekly: [
          {
            weekStart: '2026-05-11',
            weekEnd: '2026-05-17',
            totalDurationSec: 1800,
            uniqueVideos: 3,
          },
        ],
        monthly: [
          { month: '2026-05', totalDurationSec: 7200, uniqueVideos: 10 },
        ],
        allTime: { totalDurationSec: 7200, uniqueVideos: 10 },
      };
      service.getVideoStats.mockResolvedValue(expectedResult);

      const result = await controller.getVideoStats('user1');

      expect(service.getVideoStats).toHaveBeenCalledWith('user1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAdminOverview', () => {
    it('should call service.getAdminOverview', async () => {
      const expectedResult = {
        totalUsers: 100,
        activeSubscriptions: 25,
        totalRevenue: 5000000,
        recentSignups: 10,
      };
      service.getAdminOverview.mockResolvedValue(expectedResult);

      const result = await controller.getAdminOverview();

      expect(service.getAdminOverview).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});
