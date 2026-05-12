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

describe('StudyController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
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
    const email = `study_e2e_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Test123!', name: 'Studier' })
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

    // Create deck and card for study tests
    const deckRes = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Study Test Deck' })
      .expect(201);

    const deckId = deckRes.body.data.id;

    const cardRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards/auto`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'apple' })
      .expect(201);

    cardId = cardRes.body.data.id;

    // Create CardProgress so that submitReview can find it
    // This simulates the card being "added to study" (first review initializes progress)
    await prisma.cardProgress.create({
      data: {
        userId,
        globalCardId: cardId,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: new Date(), // due now so it appears in due cards
        reviewCount: 0,
        recentReviews: [],
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /study/review', () => {
    it('should submit a review', async () => {
      const res = await request(app.getHttpServer())
        .post('/study/review')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `review-${Date.now()}`)
        .send({ globalCardId: cardId, rating: 'GOOD' })
        .expect(201);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /study/due', () => {
    it('should return due cards', async () => {
      const res = await request(app.getHttpServer())
        .get('/study/due')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
    });
  });
});
