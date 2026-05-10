import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import {
  createMockRedisService,
  createMockStorageService,
} from './support/test-doubles';

const mockRedisService = createMockRedisService();
const mockStorageService = createMockStorageService();

describe('FileManagerController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let anotherUserToken: string;

  const userEmail = `fileuser_${Date.now()}@test.com`;
  const anotherEmail = `another_${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create first user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, password: 'Test123!', name: 'File Owner' })
      .expect(201);
    await prisma.user.update({
      where: { email: userEmail },
      data: { isVerified: true },
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: 'Test123!' })
      .expect(200);
    accessToken = loginRes.body.data.accessToken;

    // Create second user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: anotherEmail, password: 'Test123!', name: 'Another' })
      .expect(201);
    await prisma.user.update({
      where: { email: anotherEmail },
      data: { isVerified: true },
    });
    const anotherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: anotherEmail, password: 'Test123!' })
      .expect(200);
    anotherUserToken = anotherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [userEmail, anotherEmail] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  const fakeImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  describe('POST /files/upload', () => {
    it('should upload a file successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', fakeImageBuffer, 'avatar.png')
        .field('refType', 'AVATAR')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.publicId).toBeDefined();
      expect(res.body.data.resourceType).toBe('image');
      expect(res.body.data.refType).toBe('AVATAR');
    });

    it('should reject file too large', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      await request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', largeBuffer, 'large.png')
        .expect(422);
    });

    it('should reject invalid file type', async () => {
      const textBuffer = Buffer.from('not an image');
      await request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', textBuffer, 'file.txt')
        .expect(422);
    });
  });

  describe('GET /files/:fileId', () => {
    let fileId: string;

    beforeEach(async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', fakeImageBuffer, 'test.jpg')
        .expect(201);
      fileId = uploadRes.body.data.id;
    });

    it('should return file metadata for owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/files/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(fileId);
      expect(res.body.data.url).toBeDefined();
    });

    it('should reject access for other user', async () => {
      await request(app.getHttpServer())
        .get(`/files/${fileId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403);
    });
  });

  describe('DELETE /files/:fileId', () => {
    let fileId: string;

    beforeEach(async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', fakeImageBuffer, 'del.jpg')
        .expect(201);
      fileId = uploadRes.body.data.id;
    });

    it('should delete file for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/files/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify file is deleted
      await request(app.getHttpServer())
        .get(`/files/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject delete for other user', async () => {
      await request(app.getHttpServer())
        .delete(`/files/${fileId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403);
    });
  });

  describe('GET /files/:fileId/signed-url', () => {
    let fileId: string;

    beforeEach(async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', fakeImageBuffer, 'private.jpg')
        .expect(201);
      fileId = uploadRes.body.data.id;
    });

    it('should return signed URL for owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/files/${fileId}/signed-url`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.url).toBeDefined();
      expect(typeof res.body.data.url).toBe('string');
    });
  });
});
