import { Test, TestingModule } from '@nestjs/testing';
import { ListeningService } from '@modules/listening/listening.service';
import { ListeningRepository } from '@modules/listening/listening.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { BusinessException } from '@common/filters/business.exception';
import { LISTENING_EVENTS } from '@common/constants/events.constants';
import { ListeningType } from '@modules/listening/interfaces/listening.interface';

describe('ListeningService', () => {
  let service: ListeningService;
  let repository: jest.Mocked<ListeningRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let pusherService: jest.Mocked<PusherService>;

  const mockPractice = {
    id: 'practice1',
    userId: 'user1',
    globalCardId: 'card1',
    type: ListeningType.REPEAT,
    score: 0,
    accuracy: 0,
    fluency: 0,
    duration: 0,
    youtubeId: null,
    result: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPracticeWithYoutube = {
    ...mockPractice,
    type: ListeningType.YOUTUBE_SYNC,
    youtubeId: 'dQw4w9WgXcQ',
  };

  beforeEach(async () => {
    const mockRepository = {
      createPractice: jest.fn(),
      findPracticeById: jest.fn(),
      updatePractice: jest.fn(),
      findHistoryByUser: jest.fn(),
      getUserStats: jest.fn(),
    };

    const mockPusher = { triggerToUser: jest.fn() };
    const mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListeningService,
        { provide: ListeningRepository, useValue: mockRepository },
        { provide: PusherService, useValue: mockPusher },
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

    service = module.get(ListeningService);
    repository = module.get(ListeningRepository);
    eventEmitter = module.get(EventEmitter2);
    pusherService = module.get(PusherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startExercise', () => {
    it('should create a practice with REPEAT type', async () => {
      const dto = {
        globalCardId: 'card1',
        type: ListeningType.REPEAT,
      };
      repository.createPractice.mockResolvedValue(mockPractice as any);

      const result = await service.startExercise('user1', dto);

      expect(repository.createPractice).toHaveBeenCalledWith({
        userId: 'user1',
        globalCardId: 'card1',
        type: ListeningType.REPEAT,
        score: 0,
        duration: 0,
        youtubeId: null,
      });
      expect(result).toEqual(mockPractice);
    });

    it('should create a practice with YOUTUBE_SYNC type and extract youtubeId', async () => {
      const dto = {
        globalCardId: 'card1',
        type: ListeningType.YOUTUBE_SYNC,
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      };
      repository.createPractice.mockResolvedValue(
        mockPracticeWithYoutube as any,
      );

      const result = await service.startExercise('user1', dto);

      expect(repository.createPractice).toHaveBeenCalledWith({
        userId: 'user1',
        globalCardId: 'card1',
        type: ListeningType.YOUTUBE_SYNC,
        score: 0,
        duration: 0,
        youtubeId: 'dQw4w9WgXcQ',
      });
      expect(result).toEqual(mockPracticeWithYoutube);
    });
  });

  describe('submitExercise', () => {
    it('should update practice and emit event', async () => {
      repository.findPracticeById.mockResolvedValue(mockPractice as any);
      repository.updatePractice.mockResolvedValue({} as any);

      const result = await service.submitExercise('user1', 'practice1', {
        transcriptText: 'test transcript',
        score: 95,
        accuracy: 90,
        fluency: 85,
        duration: 30000,
      });

      expect(repository.updatePractice).toHaveBeenCalledWith(
        'practice1',
        expect.objectContaining({
          score: expect.any(Number),
          accuracy: expect.any(Number),
          fluency: expect.any(Number),
          duration: expect.any(Number),
          result: expect.objectContaining({
            transcript: 'test transcript',
            submittedAt: expect.any(Date),
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LISTENING_EVENTS.COMPLETED,
        expect.objectContaining({
          userId: 'user1',
          practiceId: 'practice1',
          globalCardId: 'card1',
        }),
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        'listening.completed',
        expect.objectContaining({ globalCardId: 'card1' }),
      );
      expect(result.score).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.fluency).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should throw BusinessException if practice not found', async () => {
      repository.findPracticeById.mockResolvedValue(null);

      await expect(
        service.submitExercise('user1', 'nonexistent', {
          score: 0,
          accuracy: 0,
          fluency: 0,
          duration: 0,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException if practice belongs to another user', async () => {
      repository.findPracticeById.mockResolvedValue(mockPractice as any);

      await expect(
        service.submitExercise('otherUser', 'practice1', {
          score: 0,
          accuracy: 0,
          fluency: 0,
          duration: 0,
        }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getHistory', () => {
    it('should return paginated history', async () => {
      const mockHistory = {
        items: [mockPractice],
        total: 1,
      };
      repository.findHistoryByUser.mockResolvedValue(mockHistory as any);

      const result = await service.getHistory('user1', 1, 10);

      expect(repository.findHistoryByUser).toHaveBeenCalledWith('user1', 0, 10);
      expect(result).toEqual(mockHistory);
    });

    it('should calculate skip correctly for page 2', async () => {
      repository.findHistoryByUser.mockResolvedValue({
        items: [],
        total: 0,
      } as any);

      await service.getHistory('user1', 3, 20);

      expect(repository.findHistoryByUser).toHaveBeenCalledWith(
        'user1',
        40,
        20,
      );
    });
  });

  describe('getStats', () => {
    it('should return user stats from repository', async () => {
      const mockStats = {
        totalPractices: 10,
        averageScore: 85,
        averageAccuracy: 90,
        totalDuration: 300000,
      };
      repository.getUserStats.mockResolvedValue(mockStats as any);

      const result = await service.getStats('user1');

      expect(repository.getUserStats).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockStats);
    });
  });

  describe('extractYoutubeId', () => {
    it('should extract ID from youtube.com/watch?v= format', () => {
      const id = (service as any).extractYoutubeId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be/ format', () => {
      const id = (service as any).extractYoutubeId(
        'https://youtu.be/dQw4w9WgXcQ',
      );
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/embed/ format', () => {
      const id = (service as any).extractYoutubeId(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/shorts/ format', () => {
      const id = (service as any).extractYoutubeId(
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      );
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from m.youtube.com format', () => {
      const id = (service as any).extractYoutubeId(
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      const id = (service as any).extractYoutubeId('https://example.com');
      expect(id).toBeNull();
    });

    it('should return null for empty string', () => {
      const id = (service as any).extractYoutubeId('');
      expect(id).toBeNull();
    });
  });
});
