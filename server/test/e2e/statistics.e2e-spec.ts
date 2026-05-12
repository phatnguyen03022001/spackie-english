import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { MailService } from '@infrastructure/mail/mail.service';
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

describe('StatisticsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let cardId: string;

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Create regular user
    const email = `stats_e2e_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Test123!', name: 'Statistician' })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Test123!' })
      .expect(200);

    userToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Create admin user
    const adminEmail = `admin_stats_${Date.now()}@test.com`;
    const adminDeviceId = 'stats-admin-device';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password: 'Admin123!', name: 'Admin' })
      .expect(201);

    const adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { isVerified: true, role: 'ADMIN' },
    });

    // Authorize device for admin
    await prisma.adminDevice.create({
      data: {
        userId: adminUser.id,
        deviceId: adminDeviceId,
        deviceName: 'Stats E2E Device',
      },
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: 'Admin123!',
        deviceId: adminDeviceId,
      })
      .expect(200);

    adminToken = adminLoginRes.body.data.accessToken;

    // Create deck and card, then study and listen to generate data
    const deckRes = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Stats Test Deck' })
      .expect(201);

    const deckId = deckRes.body.data.id;

    const cardRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards/auto`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'apple' })
      .expect(201);

    cardId = cardRes.body.data.id;

    // Create CardProgress so that submitReview can find it
    await prisma.cardProgress.create({
      data: {
        userId,
        globalCardId: cardId,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: new Date(),
        reviewCount: 0,
        recentReviews: [],
      },
    });

    // Study a card to generate review data
    await request(app.getHttpServer())
      .post('/study/review')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `stats-review-${Date.now()}`)
      .send({ globalCardId: cardId, rating: 'GOOD' })
      .expect(201);

    // Start and submit a listening practice
    const startRes = await request(app.getHttpServer())
      .post('/listening/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ globalCardId: cardId, type: 'REPEAT' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/listening/${startRes.body.data.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        transcriptText: 'test',
        score: 80,
        accuracy: 75,
        fluency: 70,
        duration: 30000,
      })
      .expect(201);

    // Start a YouTube practice
    await request(app.getHttpServer())
      .post('/listening/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        globalCardId: cardId,
        type: 'YOUTUBE_SYNC',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /stats/dashboard', () => {
    it('should return dashboard stats with totalMastered', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.totalMastered).toBe('number');
      expect(typeof res.body.data.totalReviews).toBe('number');
      expect(typeof res.body.data.currentStreak).toBe('number');
    });
  });

  describe('GET /stats/videos', () => {
    it('should return video stats after YouTube practice', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/videos')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(res.body.data.weekly).toBeDefined();
      expect(res.body.data.monthly).toBeDefined();
      expect(res.body.data.allTime).toBeDefined();
    });
  });

  describe('GET /stats/admin/overview', () => {
    it('should return system stats for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.totalUsers).toBe('number');
    });

    it('should reject regular user from admin endpoint', async () => {
      await request(app.getHttpServer())
        .get('/stats/admin/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
