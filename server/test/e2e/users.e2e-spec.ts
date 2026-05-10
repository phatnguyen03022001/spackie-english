import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import {
  createMockMailService,
  createMockRedisService,
  createMockStorageService,
} from './support/test-doubles';

// Helper tạo email ngẫu nhiên
const randomEmail = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;

const mockRedisService = createMockRedisService();
const mockMailService = createMockMailService();
const mockStorageService = createMockStorageService();

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let userEmail: string;
  let adminEmail: string;
  let userId: string;
  let adminId: string;
  const adminDeviceId = 'test-device-admin-users';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Cleanup
    if (userEmail)
      await prisma.user.deleteMany({ where: { email: userEmail } });
    if (adminEmail)
      await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Tạo user thường
    userEmail = randomEmail('user');
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, password: 'Test123!', name: 'Regular User' })
      .expect(201);
    userId = userRes.body.data.id;

    // Verify user manually
    await prisma.user.update({
      where: { email: userEmail },
      data: { isVerified: true },
    });

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: 'Test123!' })
      .expect(200);
    userToken = userLogin.body.data.accessToken;

    // Tạo admin user
    adminEmail = randomEmail('admin');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password: 'Admin123!', name: 'Admin User' })
      .expect(201);

    const adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { isVerified: true, role: 'ADMIN' },
    });
    adminId = adminUser.id;

    // Authorize device for admin
    await prisma.adminDevice.create({
      data: {
        userId: adminId,
        deviceId: adminDeviceId,
        deviceName: 'E2E Test Device',
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
    adminToken = adminLogin.body.data.accessToken;
  });

  describe('POST /users (public)', () => {
    it('should create a new user', async () => {
      const newEmail = randomEmail('new');
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: newEmail,
          username: 'newuser',
          password: 'NewPass123!',
          displayName: 'New User',
        })
        .expect(201);
      expect(res.body.data.email).toBe(newEmail);
      expect(res.body.data.username).toBe('newuser');
      // Cleanup
      await prisma.user.deleteMany({ where: { email: newEmail } });
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: userEmail,
          username: 'another',
          password: 'Test123!',
        })
        .expect(409);
    });

    it('should reject duplicate username', async () => {
      const existingUsername = userEmail.split('@')[0];

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: randomEmail('dup'),
          username: existingUsername,
          password: 'Test123!',
        })
        .expect(409);
    });
  });

  describe('GET /users (admin only)', () => {
    it('should allow admin to list users with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2); // at least user and admin
    });

    it('should allow admin to search users by email', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users?search=${userEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe(userEmail);
    });

    it('should allow admin to filter by role', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.every((u: any) => u.role === 'ADMIN')).toBe(true);
    });

    it('should allow admin to filter by status', async () => {
      // active status
      const res = await request(app.getHttpServer())
        .get('/users?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.every((u: any) => u.isBanned === false)).toBe(true);
    });

    it('should allow admin to sort users', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?sort=createdAt:asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // just check that it returns 200 and array
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should forbid regular user from listing users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.email).toBe(userEmail);
    });
  });

  describe('GET /users/:id', () => {
    it('should allow user to view own profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(userId);
    });

    it('should allow admin to view any user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(userId);
    });

    it('should forbid regular user to view another user', async () => {
      // Create another regular user
      const otherEmail = randomEmail('other');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: otherEmail, password: 'Test123!', name: 'Other User' })
        .expect(201);
      const otherUser = await prisma.user.findUnique({
        where: { email: otherEmail },
      });
      await request(app.getHttpServer())
        .get(`/users/${otherUser!.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      // Cleanup
      await prisma.user.deleteMany({ where: { email: otherEmail } });
    });
  });

  describe('PATCH /users/me', () => {
    it('should update displayName', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ displayName: 'Updated Name' })
        .expect(200);
      expect(res.body.data.displayName).toBe('Updated Name');
    });

    it('should ignore extra fields like avatarUrl', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ avatarUrl: 'https://evil.com/xss.png' })
        .expect(200);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.avatarUrl).toBeNull(); // should not be set
    });

    it('should not allow update if user is banned', async () => {
      // Ban the user
      await prisma.user.update({
        where: { id: userId },
        data: { isBanned: true },
      });
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ displayName: 'Banned Name' })
        .expect(401);
      // Unban for other tests
      await prisma.user.update({
        where: { id: userId },
        data: { isBanned: false },
      });
    });
  });

  describe('PATCH /users/me/avatar', () => {
    it('should upload avatar with valid file', async () => {
      const fakeImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );
      const res = await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', fakeImage, 'avatar.png')
        .expect(200);
      expect(res.body.data.avatarUrl).toBeDefined();
    });

    it('should reject file too large (>5MB)', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', largeBuffer, 'large.png')
        .expect(422); // Unprocessable Entity
    });

    it('should reject invalid file type (e.g., text file)', async () => {
      const textBuffer = Buffer.from('not an image');
      await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', textBuffer, 'file.txt')
        .expect(422);
    });

    it('should reject when no file uploaded', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(422);
    });
  });

  describe('DELETE /users/me', () => {
    it('should soft delete own account', async () => {
      const tempEmail = randomEmail('temp');
      // Create a temporary user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: tempEmail, password: 'Temp123!', name: 'Temp User' })
        .expect(201);
      await prisma.user.update({
        where: { email: tempEmail },
        data: { isVerified: true },
      });
      const tempLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: tempEmail, password: 'Temp123!' })
        .expect(200);
      const tempToken = tempLogin.body.data.accessToken;

      await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${tempToken}`)
        .expect(200);
      const deletedUser = await prisma.user.findUnique({
        where: { email: tempEmail },
      });
      expect(deletedUser?.deletedAt).not.toBeNull();
      expect(deletedUser?.isActive).toBe(false);
      // Cleanup
      await prisma.user.deleteMany({ where: { email: tempEmail } });
    });

    it('should not allow banned user to delete account', async () => {
      const bannedEmail = randomEmail('banned');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: bannedEmail,
          password: 'Banned123!',
          name: 'Banned User',
        })
        .expect(201);
      await prisma.user.update({
        where: { email: bannedEmail },
        data: { isVerified: true, isBanned: true },
      });
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: bannedEmail, password: 'Banned123!' })
        .expect(403); // cannot login
      // Cannot get token, so skip; instead we test directly via user token after banning our main user?
      // We'll test by banning main user and then trying to delete.
      await prisma.user.update({
        where: { id: userId },
        data: { isBanned: true },
      });
      await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);
      await prisma.user.update({
        where: { id: userId },
        data: { isBanned: false },
      });
    });
  });

  describe('Admin user management', () => {
    let targetUserId: string;
    let targetUserEmail: string;

    beforeEach(async () => {
      targetUserEmail = randomEmail('target');
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: targetUserEmail,
          password: 'Target123!',
          name: 'Target User',
        })
        .expect(201);
      targetUserId = res.body.data.id;
      await prisma.user.update({
        where: { email: targetUserEmail },
        data: { isVerified: true },
      });
    });

    afterEach(async () => {
      await prisma.user.deleteMany({ where: { email: targetUserEmail } });
    });

    describe('POST /users/:id/ban', () => {
      it('should allow admin to ban a user', async () => {
        const res = await request(app.getHttpServer())
          .post(`/users/${targetUserId}/ban`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        expect(res.body.data.isBanned).toBe(true);
        const user = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
        expect(user?.isBanned).toBe(true);
      });

      it('should return 404 if user not found', async () => {
        await request(app.getHttpServer())
          .post('/users/507f1f77bcf86cd799439011/ban')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('POST /users/:id/unban', () => {
      it('should allow admin to unban a user', async () => {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { isBanned: true },
        });
        const res = await request(app.getHttpServer())
          .post(`/users/${targetUserId}/unban`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        expect(res.body.data.isBanned).toBe(false);
      });
    });

    describe('DELETE /users/:id/hard', () => {
      it('should allow admin to permanently delete a user', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${targetUserId}/hard`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        const user = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
        expect(user).toBeNull();
      });
    });
  });
});
