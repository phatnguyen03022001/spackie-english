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

describe('ListeningController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
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
    const email = `listen_e2e_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Test123!', name: 'Listener' })
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

    // Create deck and card for listening tests
    const deckRes = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Listening Test Deck' })
      .expect(201);

    const deckId = deckRes.body.data.id;

    const cardRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards/auto`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'apple' })
      .expect(201);

    cardId = cardRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /listening/start', () => {
    it('should start a repeat listening session', async () => {
      const res = await request(app.getHttpServer())
        .post('/listening/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ globalCardId: cardId, type: 'REPEAT' })
        .expect(201);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
    });
  });

  describe('POST /listening/:id/submit', () => {
    it('should submit a listening session', async () => {
      const startRes = await request(app.getHttpServer())
        .post('/listening/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ globalCardId: cardId, type: 'REPEAT' })
        .expect(201);

      const exerciseId = startRes.body.data.id;

      const res = await request(app.getHttpServer())
        .post(`/listening/${exerciseId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          transcriptText: 'test transcript',
          score: 80,
          accuracy: 75,
          fluency: 70,
          duration: 30000,
        })
        .expect(201);

      expect(res.body).toBeDefined();
    });
  });
});
