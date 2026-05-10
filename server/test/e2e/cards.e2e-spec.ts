import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { createMockRedisService } from './support/test-doubles';

const mockRedis = createMockRedisService();

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
      .overrideProvider(RedisService)
      .useValue(mockRedis)
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

  it('GET /decks/:deckId/cards -> 200 (list cards)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('GET /decks/:deckId/cards/:cardId -> 200 (card detail via deck endpoint)', async () => {
    // Tạo card mới để lấy ID trực tiếp
    const createRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: `detail_test_${Date.now()}`, back: 'test detail' })
      .expect(201);
    const cardId = createRes.body.data.id;

    // Retry cơ chế: đôi khi cache chưa kịp invalidate
    let res: request.Response | undefined;
    for (let i = 0; i < 3; i++) {
      res = await request(app.getHttpServer())
        .get(`/decks/${deckId}/cards/${cardId}`)
        .set('Authorization', `Bearer ${userToken}`);
      if (res.status === 200) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(res?.status).toBe(200);
    expect(res?.body.data.id).toBe(cardId);
  });

  it('DELETE /decks/:deckId/cards/:cardId -> 200 (remove card from deck)', async () => {
    // Tạo card mới để xoá
    const createRes = await request(app.getHttpServer())
      .post(`/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: `delete_me_${Date.now()}`, back: 'to delete' })
      .expect(201);
    const cardId = createRes.body.data.id;

    await request(app.getHttpServer())
      .delete(`/decks/${deckId}/cards/${cardId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
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
