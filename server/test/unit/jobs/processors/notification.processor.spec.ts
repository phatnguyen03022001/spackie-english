// test/unit/jobs/processors/notification.processor.spec.ts
import { NotificationProcessor } from '@jobs/processors/notification.processor';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { MailService } from '@infrastructure/mail/mail.service';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let pusherService: jest.Mocked<PusherService>;
  let mailService: jest.Mocked<MailService>;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockPusherService = {
    triggerToUser: jest.fn(),
  };

  const mockMailService = {
    send: jest.fn(),
  };

  beforeEach(() => {
    // Use resetAllMocks to clear both call history AND implementations
    jest.resetAllMocks();

    // Re-assign default implementations after reset
    mockPusherService.triggerToUser.mockResolvedValue(undefined);
    mockMailService.send.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findMany.mockResolvedValue([]);

    processor = new NotificationProcessor(
      mockPrisma as any,
      mockPusherService as any,
      mockMailService as any,
    );
    pusherService = mockPusherService as any;
    mailService = mockMailService as any;

    // Mock Date to always be 08:00 AM local time
    jest.useFakeTimers({ advanceTimers: false });
    jest.setSystemTime(new Date('2024-01-01T08:00:00+07:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleDailyReminder', () => {
    const mockJob = { data: { triggeredAt: '2024-01-01T08:00:00Z' } } as any;
    const activeUser = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      settings: {
        reminderEnabled: true,
        reminderTime: '08:00',
        pushEnabled: true,
        emailNotificationEnabled: true,
      },
    };

    it('should send push and email reminders to matching users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([activeUser]);

      await processor.handleDailyReminder(mockJob);

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        'daily.reminder',
        expect.objectContaining({
          message: "Don't forget to practice your English today!",
        }),
      );
      expect(mailService.send).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('Daily Practice Reminder'),
        expect.any(String),
      );
    });

    it('should skip users with reminders disabled', async () => {
      const disabledUser = {
        ...activeUser,
        settings: { reminderEnabled: false },
      };
      mockPrisma.user.findMany.mockResolvedValue([disabledUser]);

      await processor.handleDailyReminder(mockJob);

      expect(pusherService.triggerToUser).not.toHaveBeenCalled();
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('should skip users with non-matching reminder time', async () => {
      const differentTimeUser = {
        ...activeUser,
        settings: { reminderTime: '20:00' },
      };
      mockPrisma.user.findMany.mockResolvedValue([differentTimeUser]);

      await processor.handleDailyReminder(mockJob);

      expect(pusherService.triggerToUser).not.toHaveBeenCalled();
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('should handle individual user failures gracefully', async () => {
      const user2 = { ...activeUser, id: 'user-2' };
      mockPrisma.user.findMany.mockResolvedValue([activeUser, user2]);
      pusherService.triggerToUser
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Pusher error'));

      // Should not throw - errors are caught per user
      await expect(
        processor.handleDailyReminder(mockJob),
      ).resolves.not.toThrow();
    });
  });

  describe('handleSendEmail', () => {
    const emailJob = {
      data: { userId: 'user-1', subject: 'Test Subject', body: '<p>Test</p>' },
    } as any;

    it('should fetch user and send email + push notification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        displayName: 'Test',
      });

      await processor.handleSendEmail(emailJob);

      expect(mailService.send).toHaveBeenCalledWith(
        'test@example.com',
        'Test Subject',
        '<p>Test</p>',
      );
      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        'notification.email',
        expect.objectContaining({ subject: 'Test Subject' }),
      );
    });

    it('should skip if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await processor.handleSendEmail(emailJob);

      expect(mailService.send).not.toHaveBeenCalled();
      expect(pusherService.triggerToUser).not.toHaveBeenCalled();
    });
  });

  describe('handleSendPush', () => {
    const pushJob = {
      data: {
        userId: 'user-1',
        title: 'New Message',
        message: 'You have a new message',
      },
    } as any;

    it('should send push notification via Pusher', async () => {
      await processor.handleSendPush(pushJob);

      expect(pusherService.triggerToUser).toHaveBeenCalledWith(
        'user-1',
        'notification.push',
        { title: 'New Message', message: 'You have a new message' },
      );
    });
  });
});
