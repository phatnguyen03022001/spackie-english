import { Test, TestingModule } from '@nestjs/testing';
import { ListeningController } from '@modules/listening/listening.controller';
import { ListeningService } from '@modules/listening/listening.service';
import { ListeningType } from '@modules/listening/interfaces/listening.interface';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';

describe('ListeningController', () => {
  let controller: ListeningController;
  let service: jest.Mocked<ListeningService>;

  beforeEach(async () => {
    const mockService = {
      startExercise: jest.fn(),
      submitExercise: jest.fn(),
      getHistory: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListeningController],
      providers: [
        { provide: ListeningService, useValue: mockService },
        {
          provide: 'ICacheManager',
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ListeningController);
    service = module.get(ListeningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startExercise', () => {
    it('should call service.startExercise with userId and dto', async () => {
      const dto = {
        globalCardId: 'card1',
        type: ListeningType.REPEAT,
      };
      const expectedResult = { id: 'practice1' };
      service.startExercise.mockResolvedValue(expectedResult as any);

      const result = await controller.startExercise('user1', dto);

      expect(service.startExercise).toHaveBeenCalledWith('user1', dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('submitExercise', () => {
    it('should call service.submitExercise with userId, exerciseId, and dto', async () => {
      const dto = {
        transcriptText: 'hello',
        score: 95,
        accuracy: 90,
        fluency: 85,
        duration: 30000,
      };
      const expectedResult = {
        score: 95,
        accuracy: 90,
        fluency: 85,
        duration: 30000,
      };
      service.submitExercise.mockResolvedValue(expectedResult as any);

      const result = await controller.submitExercise(
        'user1',
        'practice1',
        dto,
        'idempotency-key',
      );

      expect(service.submitExercise).toHaveBeenCalledWith(
        'user1',
        'practice1',
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getHistory', () => {
    it('should call service.getHistory with default pagination', async () => {
      const expectedResult = { items: [], total: 0 };
      service.getHistory.mockResolvedValue(expectedResult as any);

      const result = await controller.getHistory('user1');

      expect(service.getHistory).toHaveBeenCalledWith('user1', 1, 10);
      expect(result).toEqual(expectedResult);
    });

    it('should call service.getHistory with custom pagination', async () => {
      const expectedResult = { items: [], total: 0 };
      service.getHistory.mockResolvedValue(expectedResult as any);

      const result = await controller.getHistory('user1', 2, 20);

      expect(service.getHistory).toHaveBeenCalledWith('user1', 2, 20);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getStats', () => {
    it('should call service.getStats with userId', async () => {
      const expectedResult = {
        totalPractices: 10,
        averageScore: 85,
        averageAccuracy: 90,
        totalDuration: 300000,
      };
      service.getStats.mockResolvedValue(expectedResult as any);

      const result = await controller.getStats('user1');

      expect(service.getStats).toHaveBeenCalledWith('user1');
      expect(result).toEqual(expectedResult);
    });
  });
});
