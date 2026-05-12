import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StudyController } from '@modules/study/study.controller';
import { StudyService } from '@modules/study/study.service';

describe('StudyController', () => {
  let controller: StudyController;
  let service: jest.Mocked<StudyService>;

  beforeEach(async () => {
    const mockService = {
      getDueCards: jest.fn(),
      submitReview: jest.fn(),
      getDueCount: jest.fn(),
      getStreak: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyController],
      providers: [{ provide: StudyService, useValue: mockService }],
    }).compile();

    controller = module.get(StudyController);
    service = module.get(StudyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDueCards', () => {
    it('should call service.getDueCards with userId and query', async () => {
      const query = { page: 1, limit: 20, deckId: 'deck1' };
      const expectedResult = { data: [], total: 0 };
      service.getDueCards.mockResolvedValue(expectedResult);

      const result = await controller.getDueCards('user1', query);

      expect(service.getDueCards).toHaveBeenCalledWith('user1', query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('submitReview', () => {
    it('should call service.submitReview with userId and dto', async () => {
      const dto = { globalCardId: 'card1', rating: 'GOOD' as const };
      const expectedResult = {
        nextDueDate: new Date(),
        interval: 1,
        easeFactor: 2.5,
        dueCountRemaining: 5,
      };
      service.submitReview.mockResolvedValue(expectedResult as any);

      const result = await controller.submitReview(
        'user1',
        dto,
        'idemp-key-123',
      );

      expect(service.submitReview).toHaveBeenCalledWith('user1', dto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if Idempotency-Key is missing', async () => {
      const dto = { globalCardId: 'card1', rating: 'GOOD' as const };

      await expect(
        controller.submitReview('user1', dto, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle concurrent requests with same Idempotency-Key', async () => {
      const dto = { globalCardId: 'card1', rating: 'GOOD' as const };
      const expectedResult = {
        nextDueDate: new Date(),
        interval: 1,
        easeFactor: 2.5,
        dueCountRemaining: 5,
      };
      service.submitReview.mockResolvedValue(expectedResult as any);

      // Simulate 3 concurrent requests with the same idempotency key
      const results = await Promise.all([
        controller.submitReview('user1', dto, 'concurrent-key'),
        controller.submitReview('user1', dto, 'concurrent-key'),
        controller.submitReview('user1', dto, 'concurrent-key'),
      ]);

      // All should return the same result
      results.forEach((result) => {
        expect(result).toEqual(expectedResult);
      });

      // The controller passes through to service - idempotency is handled by interceptor
      // So service should be called 3 times (controller doesn't deduplicate)
      expect(service.submitReview).toHaveBeenCalledTimes(3);
    });
  });

  describe('getDueCount', () => {
    it('should call service.getDueCount with userId', async () => {
      service.getDueCount.mockResolvedValue({ dueCount: 10 });

      const result = await controller.getDueCount('user1');

      expect(service.getDueCount).toHaveBeenCalledWith('user1', undefined);
      expect(result).toEqual({ dueCount: 10 });
    });

    it('should call service.getDueCount with deckId', async () => {
      service.getDueCount.mockResolvedValue({ dueCount: 3 });

      const result = await controller.getDueCount('user1', 'deck1');

      expect(service.getDueCount).toHaveBeenCalledWith('user1', 'deck1');
      expect(result).toEqual({ dueCount: 3 });
    });
  });

  describe('getStreak', () => {
    it('should call service.getStreak with userId', async () => {
      const expectedResult = { currentStreak: 5, longestStreak: 10 };
      service.getStreak.mockResolvedValue(expectedResult);

      const result = await controller.getStreak('user1');

      expect(service.getStreak).toHaveBeenCalledWith('user1');
      expect(result).toEqual(expectedResult);
    });
  });
});
