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
  createMockMailService,
  createMockRedisService,
  createMockPusherService,
  createMockStorageService,
  createMockQueue,
  QUEUE_NAMES,
} from './support/test-doubles';
import { getQueueToken } from '@nestjs/bull';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';

const mockRedis = createMockRedisService();
const mockMailService = createMockMailService();
const mockPusherService = createMockPusherService();
const mockStorageService = createMockStorageService();
const mockQueue = createMockQueue();

describe('CardsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let deckId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WordValidatorClient)
      .useValue({
        validateWord: jest.fn().mockResolvedValue({ isValid: true }),
      })
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .overrideProvider(getQueueToken(QUEUE_NAMES.NOTIFICATION))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.AI_ENRICHMENT))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.MEDIA_ENRICHMENT))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.PAYMENT_WEBHOOK))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.FAILED_TTS))
      .useValue(mockQueue)
      .overrideProvider(PusherService)
      .useValue(mockPusherService)
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Tạo user và lấy token
    const email = `cards_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Test123!', name: 'Card Tester' });
    await prisma.user.update({ where: { email }, data: { isVerified: true } });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Test123!' });
    userToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Tạo deck để test cards
    const deckRes = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Test Deck for Cards', visibility: 'PUBLIC' });
    deckId = deckRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.deckCardMapping.deleteMany({ where: { deckId } });
    await prisma.deck.deleteMany({ where: { id: deckId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /decks/:deckId/cards -> 201 (create manual card)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'hello', back: 'xin chào' })
      .expect(201);
    expect(res.body.data.front).toBe('hello');
    expect(res.body.data.back).toBe('xin chào');
  });

  it('POST /decks/:deckId/cards -> 409 if card already in deck', async () => {
    await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'hello', back: 'xin chào' })
      .expect(409);
  });

  describe('Idempotency for manual card creation', () => {
    it('should return same response for duplicate request with same Idempotency-Key', async () => {
      const idempotencyKey = `manual-idemp-${Date.now()}`;
      const uniqueWord = `letter${Date.now()}`;

      const firstRes = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ front: uniqueWord, back: 'bức thư' })
        .expect(201);

      const secondRes = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ front: uniqueWord, back: 'bức thư' })
        .expect(201);

      expect(secondRes.body.data.id).toBe(firstRes.body.data.id);
      expect(secondRes.headers['x-idempotency-replayed']).toBe('true');
    });

    it('should create separate cards for different Idempotency-Keys', async () => {
      const key1 = `manual-unique-1-${Date.now()}`;
      const key2 = `manual-unique-2-${Date.now()}`;
      const uniqueWord1 = `pencil${Date.now()}`;
      const uniqueWord2 = `school${Date.now()}`;

      const res1 = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', key1)
        .send({ front: uniqueWord1, back: 'cây bút chì' })
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', key2)
        .send({ front: uniqueWord2, back: 'ngôi trường' })
        .expect(201);

      expect(res1.body.data.id).not.toBe(res2.body.data.id);
    });

    it('should work without Idempotency-Key (backward compatible)', async () => {
      const randomLetters = Math.random().toString(36).substring(2, 8);
      await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ front: `island_${randomLetters}`, back: 'hòn đảo' })
        .expect(201);
    });
  });

  it('GET /decks/:deckId/cards -> 200 (list cards)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('GET /decks/:deckId/cards/:cardId -> 200 (card detail via deck endpoint)', async () => {
    // Tạo card mới để lấy ID trực tiếp - dùng từ tiếng Anh hợp lệ
    const createRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'garden', back: 'khu vườn' })
      .expect(201);
    const cardId = createRes.body.data.id;

    // Đợi cache invalidation hoàn tất (flush mock Redis store)
    mockRedis.reset();
    await new Promise((r) => setTimeout(r, 500));

    const res = await request(app.getHttpServer())
      .get(`/decks/${deckId}/cards/${cardId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(res.body.data.id).toBe(cardId);
  });

  it('DELETE /decks/:deckId/cards/:cardId -> 200 (remove card from deck)', async () => {
    // Tạo card mới để xoá - dùng từ tiếng Anh hợp lệ
    const createRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'sunset', back: 'hoàng hôn' })
      .expect(201);
    const cardId = createRes.body.data.id;

    await request(app.getHttpServer())
      .delete(`/decks/${deckId}/cards/${cardId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });

  describe('POST /decks/:deckId/cards/batch (batch create)', () => {
    it('should accept batch creation and return batchId', async () => {
      const res = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `batch-test-${Date.now()}`)
        .send({
          fronts: ['apple', 'banana', 'cherry'],
          idempotencyKey: `batch-test-${Date.now()}`,
        })
        .expect(202);
      expect(res.body.data.batchId).toBeDefined();
      expect(res.body.data.jobIds).toBeInstanceOf(Array);
      expect(res.body.data.statusUrl).toBeDefined();
    });

    it('should accept batch creation without Idempotency-Key (optional)', async () => {
      await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fronts: ['apple', 'banana'] })
        .expect(202);
    });

    it('should reject batch creation with empty fronts array', async () => {
      await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `batch-empty-${Date.now()}`)
        .send({ fronts: [] })
        .expect(400);
    });

    it('should reject batch creation with too many fronts', async () => {
      const manyFronts = Array.from({ length: 101 }, (_, i) => `word${i}`);
      await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `batch-too-many-${Date.now()}`)
        .send({ fronts: manyFronts })
        .expect(400);
    });

    it('should return idempotent response for duplicate batch request', async () => {
      const idempotencyKey = `batch-idemp-${Date.now()}`;
      const firstRes = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ fronts: ['grape', 'melon'], idempotencyKey })
        .expect(202);

      const secondRes = await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ fronts: ['grape', 'melon'], idempotencyKey })
        .expect(202);

      expect(secondRes.body.data.batchId).toBe(firstRes.body.data.batchId);
    });

    it('should reject non-owner from batch creating in private deck', async () => {
      const emailOther = `batch_other_${Date.now()}@test.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailOther, password: 'Test123!', name: 'Other' });
      await prisma.user.update({
        where: { email: emailOther },
        data: { isVerified: true },
      });
      const loginOther = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailOther, password: 'Test123!' });
      const otherToken = loginOther.body.data.accessToken;

      await request(app.getHttpServer())
        .post(`/decks/${deckId}/cards/batch`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('Idempotency-Key', `batch-other-${Date.now()}`)
        .send({ fronts: ['test'] })
        .expect(403);

      await prisma.user.deleteMany({ where: { email: emailOther } });
    });
  });

  it('POST /decks/:deckId/cards -> 403 if not owner of private deck', async () => {
    // Tạo user khác
    const email2 = `cards_other_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email2, password: 'Test123!', name: 'Other' });
    await prisma.user.update({
      where: { email: email2 },
      data: { isVerified: true },
    });
    const loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email2, password: 'Test123!' });
    const otherToken = loginRes2.body.data.accessToken;

    // Tạo private deck
    const privateDeckRes = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Private Deck', visibility: 'PRIVATE' });
    const privateDeckId = privateDeckRes.body.data.id;

    await request(app.getHttpServer())
      .post(`/decks/${privateDeckId}/cards`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ front: 'test', back: 'test' })
      .expect(403);

    // Cleanup
    await prisma.deck.deleteMany({ where: { id: privateDeckId } });
    await prisma.user.deleteMany({ where: { email: email2 } });
  });
});
