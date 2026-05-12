import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { NotificationService } from '@modules/notification/notification.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import {
  createMockRedisService,
  createMockMailService,
  createMockPusherService,
  createMockStorageService,
  createMockQueue,
  QUEUE_NAMES,
} from './support/test-doubles';
import { getQueueToken } from '@nestjs/bull';

describe('NotificationService (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notificationService: NotificationService;
  let pusherService: PusherService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(createMockRedisService())
      .overrideProvider(MailService)
      .useValue(createMockMailService())
      .overrideProvider(getQueueToken(QUEUE_NAMES.NOTIFICATION))
      .useValue(createMockQueue())
      .overrideProvider(getQueueToken(QUEUE_NAMES.AI_ENRICHMENT))
      .useValue(createMockQueue())
      .overrideProvider(getQueueToken(QUEUE_NAMES.MEDIA_ENRICHMENT))
      .useValue(createMockQueue())
      .overrideProvider(getQueueToken(QUEUE_NAMES.PAYMENT_WEBHOOK))
      .useValue(createMockQueue())
      .overrideProvider(getQueueToken(QUEUE_NAMES.FAILED_TTS))
      .useValue(createMockQueue())
      .overrideProvider(PusherService)
      .useValue(createMockPusherService())
      .overrideProvider(StorageService)
      .useValue(createMockStorageService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    notificationService = app.get(NotificationService);
    pusherService = app.get(PusherService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('send', () => {
    it('should send a realtime notification via Pusher', async () => {
      // Mock Pusher to avoid actual network calls
      const spy = jest
        .spyOn(pusherService, 'triggerToUser')
        .mockResolvedValue();

      await notificationService.send('user1', 'study.reminder', {
        title: 'Time to study!',
        body: 'You have 5 cards due today.',
      });

      expect(spy).toHaveBeenCalledWith('user1', 'study.reminder', {
        title: 'Time to study!',
        body: 'You have 5 cards due today.',
      });

      spy.mockRestore();
    });

    it('should handle payment.success event', async () => {
      const spy = jest
        .spyOn(pusherService, 'triggerToUser')
        .mockResolvedValue();

      await notificationService.send('user1', 'payment.success', {
        orderCode: 'ORDER123',
        amount: 99000,
      });

      expect(spy).toHaveBeenCalledWith('user1', 'payment.success', {
        orderCode: 'ORDER123',
        amount: 99000,
      });

      spy.mockRestore();
    });
  });
});
