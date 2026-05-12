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

const mockRedisService = createMockRedisService();
const mockMailService = createMockMailService();
const mockPusherService = createMockPusherService();
const mockStorageService = createMockStorageService();
const mockQueue = createMockQueue();

const randomEmail = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;

describe('DecksModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  const userEmail = randomEmail('decks');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
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

    // Create test user via register
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, password: 'Test123!', name: 'Deck Tester' })
      .expect(201);
    userId = userRes.body.data.id;

    // Verify user manually
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: 'Test123!' })
      .expect(200);
    userToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: userEmail },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.reset();
  });

  describe('POST /decks', () => {
    it('should create a deck and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'My first deck', visibility: 'PUBLIC' })
        .expect(201);

      expect(res.body.data.title).toBe('My first deck');
      expect(res.body.data.visibility).toBe('PUBLIC');
      expect(res.body.message).toBe('Deck created');
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/decks')
        .send({ title: 'No auth deck' })
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /decks/mine', () => {
    it('should return paginated list of own decks', async () => {
      // Create a deck first
      await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'My deck' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/decks/mine')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/decks/mine').expect(401);
    });
  });

  describe('GET /decks/public', () => {
    it('should return public decks without auth', async () => {
      // Create a public deck
      await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Public deck', visibility: 'PUBLIC' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/decks/public')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /decks/:id', () => {
    it('should return deck detail', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Detail deck' })
        .expect(201);
      const deckId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .get(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(deckId);
      expect(res.body.data.title).toBe('Detail deck');
    });

    it('should return 404 for non-existent deck', async () => {
      await request(app.getHttpServer())
        .get('/decks/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PATCH /decks/:id', () => {
    it('should update deck title', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'To update' })
        .expect(201);
      const deckId = createRes.body.data.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated title' })
        .expect(200);

      expect(updateRes.body.data.title).toBe('Updated title');
      expect(updateRes.body.message).toBe('Deck updated');
    });

    it('should return 403 when updating another user deck', async () => {
      // Create a deck as current user
      const createRes = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'My deck' })
        .expect(201);
      const deckId = createRes.body.data.id;

      // Try to update with a different user
      const otherEmail = randomEmail('other');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: otherEmail, password: 'Test123!', name: 'Other' });
      const otherUser = await prisma.user.findUnique({
        where: { email: otherEmail },
      });
      if (otherUser) {
        await prisma.user.update({
          where: { id: otherUser.id },
          data: { isVerified: true },
        });
      }
      const otherLoginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: otherEmail, password: 'Test123!' });
      const otherToken = otherLoginRes.body.data.accessToken;

      await request(app.getHttpServer())
        .patch(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /decks/:id', () => {
    it('should soft delete deck', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'To delete' })
        .expect(201);
      const deckId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify deck is soft deleted (should return 404)
      await request(app.getHttpServer())
        .get(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 403 when deleting another user deck', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'My deck' })
        .expect(201);
      const deckId = createRes.body.data.id;

      const otherEmail = randomEmail('other2');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: otherEmail, password: 'Test123!', name: 'Other2' });
      const otherUser = await prisma.user.findUnique({
        where: { email: otherEmail },
      });
      if (otherUser) {
        await prisma.user.update({
          where: { id: otherUser.id },
          data: { isVerified: true },
        });
      }
      const otherLoginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: otherEmail, password: 'Test123!' });
      const otherToken = otherLoginRes.body.data.accessToken;

      await request(app.getHttpServer())
        .delete(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });
});
