import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationRepository } from '@modules/notification/notification.repository';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('NotificationService', () => {
  let service: NotificationService;
  let pusherService: jest.Mocked<PusherService>;

  const mockQueue = {
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    add: jest.fn().mockResolvedValue({}),
  };

  const mockRepository = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findById: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    delete: jest.fn(),
    countUnread: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const mockPusherService = {
      triggerToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: mockRepository },
        { provide: PusherService, useValue: mockPusherService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: getQueueToken('notification'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(NotificationService);
    pusherService = module.get(PusherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send a realtime notification via Pusher', async () => {
      await service.send('user1', 'study.reminder', {
        title: 'Time to study!',
        body: 'You have 5 cards due today.',
      });

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        'study.reminder',
        { title: 'Time to study!', body: 'You have 5 cards due today.' },
      );
    });

    it('should handle different event types', async () => {
      await service.send('user1', 'payment.success', {
        orderCode: 'ORDER123',
        amount: 99000,
      });

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        'payment.success',
        { orderCode: 'ORDER123', amount: 99000 },
      );
    });

    it('should handle empty data payload', async () => {
      await service.send('user1', 'test.event', {});

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user1',
        'test.event',
        {},
      );
    });

    it('should propagate Pusher errors', async () => {
      pusherService.triggerToUser.mockRejectedValue(
        new Error('Pusher connection error'),
      );

      await expect(service.send('user1', 'test.event', {})).rejects.toThrow(
        'Pusher connection error',
      );
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status counts', async () => {
      const status = await service.getQueueStatus();

      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(status).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('triggerDailyReminder', () => {
    it('should enqueue a daily-reminder job', async () => {
      await service.triggerDailyReminder();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'daily-reminder',
        expect.objectContaining({ triggeredAt: expect.any(String) }),
        { removeOnComplete: true },
      );
    });
  });
});
