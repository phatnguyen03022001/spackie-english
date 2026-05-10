import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { MailService } from '@infrastructure/mail/mail.service';
import {
  createMockMailService,
  createMockRedisService,
} from './support/test-doubles';

const mockRedisService = createMockRedisService();
const mockMailService = createMockMailService();

// Helper tạo email ngẫu nhiên
const randomEmail = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;

describe('SettingsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let adminAccessToken: string;
  let testUserId: string;
  let adminUserId: string;
  const adminDeviceId = 'settings-admin-device';
  const userEmail = randomEmail('user');
  const adminEmail = randomEmail('admin');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create test user via register
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, password: 'Test123!', name: 'Test User' })
      .expect(201);
    testUserId = userRes.body.data.id;

    // Verify user manually
    await prisma.user.update({
      where: { id: testUserId },
      data: { isVerified: true },
    });

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: 'Test123!' })
      .expect(200);
    accessToken = userLogin.body.data.accessToken;

    // Create admin user via register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password: 'Admin123!', name: 'Admin User' })
      .expect(201);

    const adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { isVerified: true, role: 'ADMIN' },
    });
    adminUserId = adminUser.id;

    // Authorize device for admin
    await prisma.adminDevice.create({
      data: {
        userId: adminUserId,
        deviceId: adminDeviceId,
        deviceName: 'Settings E2E Device',
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: 'Admin123!',
        deviceId: adminDeviceId,
      })
      .expect(200);
    adminAccessToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [userEmail, adminEmail] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset settings to defaults before each test
    await prisma.user.update({
      where: { id: testUserId },
      data: { settings: {} },
    });
  });

  describe('GET /settings', () => {
    it('should return default settings when not yet saved', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.reminderEnabled).toBe(true);
      expect(res.body.data.reminderTime).toBe('08:00');
      expect(res.body.data.theme).toBe('light');
      expect(res.body.data.language).toBe('vi');
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/settings').expect(401);
    });
  });

  describe('PATCH /settings', () => {
    it('should update settings partially', async () => {
      const res = await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'en', theme: 'dark' })
        .expect(200);

      expect(res.body.data.language).toBe('en');
      expect(res.body.data.theme).toBe('dark');
      expect(res.body.data.reminderEnabled).toBe(true); // unchanged
    });

    it('should reflect updated settings on GET', async () => {
      // First update
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'en', theme: 'dark' })
        .expect(200);

      // Then verify GET returns updated values
      const res = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.language).toBe('en');
      expect(res.body.data.theme).toBe('dark');
    });

    it('should invalidate cache after update', async () => {
      // Update
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'ja' });

      // GET should reflect change immediately (cache invalidated)
      const second = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(second.body.data.language).toBe('ja');
    });

    it('should update reminderEnabled and reminderTime together', async () => {
      const res = await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reminderEnabled: true, reminderTime: '09:00' })
        .expect(200);

      expect(res.body.data.reminderEnabled).toBe(true);
      expect(res.body.data.reminderTime).toBe('09:00');
    });

    it('should reject invalid reminderTime format', async () => {
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reminderTime: 'invalid' })
        .expect(400);
    });

    it('should reject invalid theme value', async () => {
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ theme: 'neon' })
        .expect(400);
    });
  });

  describe('DELETE /settings', () => {
    it('should reset settings to defaults', async () => {
      // First update to non-default values
      await request(app.getHttpServer())
        .patch('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ language: 'en', theme: 'dark' })
        .expect(200);

      // Then reset
      const res = await request(app.getHttpServer())
        .delete('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.language).toBe('vi');
      expect(res.body.data.theme).toBe('light');
    });
  });

  describe('GET /settings/:userId (admin)', () => {
    it('should allow admin to view any user settings', async () => {
      const res = await request(app.getHttpServer())
        .get(`/settings/${testUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      await request(app.getHttpServer())
        .get(`/settings/${adminUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});
