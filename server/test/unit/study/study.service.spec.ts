import { Test, TestingModule } from '@nestjs/testing';
import { StudyService } from '@modules/study/study.service';
import { StudyRepository } from '@modules/study/study.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { BusinessException } from '@common/filters/business.exception';
import {
  STUDY_EVENTS,
  PUSHER_EVENTS,
} from '@common/constants/events.constants';
import { ERROR_CODES } from '@common/constants/error-codes.const';

jest.mock('@modules/study/utils/sm2-algorithm', () => ({
  calculateSM2: jest.fn().mockReturnValue({
    easeFactor: 2.6,
    interval: 1,
    repetitions: 1,
    dueDate: new Date('2026-05-12'),
  }),
  calculateStreak: jest.fn().mockReturnValue({
    currentStreak: 3,
    longestStreak: 5,
  }),
}));

import {
  calculateSM2,
  calculateStreak,
} from '@modules/study/utils/sm2-algorithm';

describe('StudyService', () => {
  let service: StudyService;
  let repository: jest.Mocked<StudyRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let pusherService: jest.Mocked<PusherService>;

  const mockCardProgress = {
    userId: 'user1',
    globalCardId: 'card1',
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date('2026-05-10'),
    lastRating: null,
    reviewCount: 0,
    recentReviews: [],
    lastReviewAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGlobalCard = {
    id: 'card1',
    front: 'apple',
    back: 'quả táo',
    imageUrl: null,
    audioUrl: null,
    extras: {},
  };

  const mockDueCardItem = {
    ...mockCardProgress,
    globalCard: mockGlobalCard,
  };

  beforeEach(async () => {
    const mockRepository = {
      findCardProgress: jest.fn(),
      upsertCardProgress: jest.fn(),
      countDueCards: jest.fn(),
      findDueCards: jest.fn(),
      updateUserStreak: jest.fn(),
      getUserStreak: jest.fn(),
    };

    const mockPusher = { triggerToUser: jest.fn() };
    const mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyService,
        { provide: StudyRepository, useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PusherService, useValue: mockPusher },
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

    service = module.get(StudyService);
    repository = module.get(StudyRepository);
    eventEmitter = module.get(EventEmitter2);
    pusherService = module.get(PusherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDueCards', () => {
    it('should return due cards with deck filter', async () => {
      const query = { page: 1, limit: 20, deckId: 'deck1' };
      repository.findDueCards.mockResolvedValue({
        items: [mockDueCardItem as any],
        total: 1,
      });

      const result = await service.getDueCards('user1', query);

      expect(repository.findDueCards).toHaveBeenCalledWith(
        'user1',
        0,
        20,
        'deck1',
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].globalCardId).toBe('card1');
      expect(result.data[0].front).toBe('apple');
      expect(result.data[0].progress.easeFactor).toBe(2.5);
      expect(result.total).toBe(1);
    });

    it('should return due cards without deck filter', async () => {
      const query = { page: 1, limit: 20 };
      repository.findDueCards.mockResolvedValue({
        items: [mockDueCardItem as any],
        total: 1,
      });

      const result = await service.getDueCards('user1', query);

      expect(repository.findDueCards).toHaveBeenCalledWith(
        'user1',
        0,
        20,
        undefined,
      );
      expect(result.data).toHaveLength(1);
    });

    it('should calculate skip correctly', async () => {
      const query = { page: 3, limit: 10 };
      repository.findDueCards.mockResolvedValue({ items: [], total: 0 } as any);

      await service.getDueCards('user1', query);

      expect(repository.findDueCards).toHaveBeenCalledWith(
        'user1',
        20,
        10,
        undefined,
      );
    });
  });

  describe('submitReview', () => {
    const dto = { globalCardId: 'card1', rating: 'GOOD' as const };

    it('should throw if card progress not found', async () => {
      repository.findCardProgress.mockResolvedValue(null);

      await expect(service.submitReview('user1', dto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.submitReview('user1', dto)).rejects.toThrow(
        'Card progress not found',
      );
    });

    it('should calculate SM-2, update progress, and return result', async () => {
      repository.findCardProgress.mockResolvedValue(mockCardProgress as any);
      repository.upsertCardProgress.mockResolvedValue({} as any);
      repository.getUserStreak.mockResolvedValue({
        currentStreak: 2,
        longestStreak: 5,
        lastStudiedAt: new Date('2026-05-10'),
      });
      repository.countDueCards.mockResolvedValue(5);

      const result = await service.submitReview('user1', dto);

      expect(calculateSM2).toHaveBeenCalledWith('GOOD', {
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
      });
      expect(repository.upsertCardProgress).toHaveBeenCalledWith(
        'user1',
        'card1',
        expect.objectContaining({
          easeFactor: 2.6,
          interval: 1,
          repetitions: 1,
          lastRating: 'GOOD',
          reviewCount: 1,
        }),
      );
      expect(repository.updateUserStreak).toHaveBeenCalledWith('user1', 3, 5);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        STUDY_EVENTS.CARD_REVIEWED,
        expect.objectContaining({
          userId: 'user1',
          globalCardId: 'card1',
          rating: 'GOOD',
        }),
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        PUSHER_EVENTS.STUDY_DUE_COUNT_UPDATED,
        { dueCount: 5, totalDue: 5 },
      );
      expect(result.nextDueDate).toBeDefined();
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.6);
      expect(result.dueCountRemaining).toBe(5);
    });

    it('should send streak update Pusher event when streak changes', async () => {
      repository.findCardProgress.mockResolvedValue(mockCardProgress as any);
      repository.upsertCardProgress.mockResolvedValue({} as any);
      repository.getUserStreak.mockResolvedValue({
        currentStreak: 2,
        longestStreak: 5,
        lastStudiedAt: new Date('2026-05-10'),
      });
      repository.countDueCards.mockResolvedValue(0);

      (calculateStreak as jest.Mock).mockReturnValue({
        currentStreak: 3,
        longestStreak: 5,
      });

      await service.submitReview('user1', dto);

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        PUSHER_EVENTS.STUDY_STREAK_UPDATED,
        { currentStreak: 3, longestStreak: 5 },
      );
    });

    it('should not send streak update if streak unchanged', async () => {
      repository.findCardProgress.mockResolvedValue(mockCardProgress as any);
      repository.upsertCardProgress.mockResolvedValue({} as any);
      repository.getUserStreak.mockResolvedValue({
        currentStreak: 3,
        longestStreak: 5,
        lastStudiedAt: new Date('2026-05-10'),
      });
      repository.countDueCards.mockResolvedValue(0);

      (calculateStreak as jest.Mock).mockReturnValue({
        currentStreak: 3,
        longestStreak: 5,
      });

      await service.submitReview('user1', dto);

      // Should only have the due count update, not streak update
      const streakCalls = (
        pusherService.triggerToUser as jest.Mock
      ).mock.calls.filter(
        (call: string[]) => call[1] === PUSHER_EVENTS.STUDY_STREAK_UPDATED,
      );
      expect(streakCalls).toHaveLength(0);
    });
  });

  describe('getDueCount', () => {
    it('should return due count without deck filter', async () => {
      repository.countDueCards.mockResolvedValue(10);

      const result = await service.getDueCount('user1');

      expect(repository.countDueCards).toHaveBeenCalledWith('user1', undefined);
      expect(result.dueCount).toBe(10);
    });

    it('should return due count with deck filter', async () => {
      repository.countDueCards.mockResolvedValue(3);

      const result = await service.getDueCount('user1', 'deck1');

      expect(repository.countDueCards).toHaveBeenCalledWith('user1', 'deck1');
      expect(result.dueCount).toBe(3);
    });
  });

  describe('getStreak', () => {
    it('should return streak info', async () => {
      repository.getUserStreak.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        lastStudiedAt: new Date(),
      });

      const result = await service.getStreak('user1');

      expect(repository.getUserStreak).toHaveBeenCalledWith('user1');
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
    });
  });
});
