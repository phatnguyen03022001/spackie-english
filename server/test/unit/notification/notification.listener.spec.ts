import { Test, TestingModule } from '@nestjs/testing';
import { NotificationListener } from '@modules/notification/notification.listener';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationRepository } from '@modules/notification/notification.repository';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  USER_EVENTS,
  PAYMENT_EVENTS,
} from '@common/constants/events.constants';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationService: jest.Mocked<NotificationService>;

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    send: jest.fn(),
    findByUser: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    delete: jest.fn(),
    countUnread: jest.fn(),
    getQueueStatus: jest.fn(),
    triggerDailyReminder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    listener = module.get(NotificationListener);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUserRegistered', () => {
    it('should create welcome notification on user.created event', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      await listener.handleUserRegistered(payload);

      expect(notificationService.create).toHaveBeenCalledWith(
        payload.userId,
        'system',
        'Welcome to Spackie English! 🎉',
        'Start your learning journey by exploring decks and practicing daily.',
        { event: 'user.registered' },
      );
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should create payment notification on payment.success event', async () => {
      const payload = {
        userId: 'user-pay-123',
        plan: 'monthly',
        amount: 99000,
      };

      await listener.handlePaymentSuccess(payload);

      expect(notificationService.create).toHaveBeenCalledWith(
        payload.userId,
        'payment',
        'Payment Successful ✅',
        expect.stringContaining('monthly'),
        expect.objectContaining({ event: 'payment.succeeded' }),
      );
    });
  });
});
