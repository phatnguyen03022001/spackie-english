import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import * as bcrypt from 'bcrypt';
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

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'e2e-auth@test.com',
    password: 'StrongP@ss123',
    name: 'E2E Auth User',
  };

  const testAdmin = {
    email: 'e2e-admin@test.com',
    password: 'AdminP@ss123',
    name: 'E2E Admin',
  };

  let userAccessToken: string;
  let userRefreshToken: string;
  const adminDeviceId = 'test-device-admin';
  const extraAdminDeviceId = 'new-device-123';

  const cleanupTestData = async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
      select: { id: true },
    });

    if (users.length > 0) {
      await prisma.adminDevice.deleteMany({
        where: { userId: { in: users.map((user) => user.id) } },
      });
    }

    await prisma.adminDevice.deleteMany({
      where: { deviceId: { in: [adminDeviceId, extraAdminDeviceId] } },
    });
    await prisma.otp.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });
  };

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

    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.reset();
    mockMailService.reset();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should not allow duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  describe('POST /auth/verify-email', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await prisma.otp.deleteMany({
        where: { email: testUser.email, type: 'VERIFY_EMAIL' },
      });

      // Tạo OTP mới với hash của '123456'
      const hashedOtp = await bcrypt.hash('123456', 10);
      await prisma.otp.create({
        data: {
          email: testUser.email,
          otpHash: hashedOtp,
          type: 'VERIFY_EMAIL',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    });

    it('should fail with invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: testUser.email, otp: '000000' })
        .expect(400);
    });

    it('should succeed with valid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: testUser.email, otp: '123456' })
        .expect(204);
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user?.isVerified).toBe(true);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should return 202 even if email not found', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'nonexistent@test.com' })
        .expect(202);
    });

    it('should return 202 if user already verified', async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true },
      });
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(202);
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should respect rate limit (3 per hour)', async () => {
      mockRedisService.reset();
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: false },
      });
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/resend-verification')
          .send({ email: testUser.email })
          .expect(202);
      }
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(429);
    });
  });

  describe('POST /auth/login', () => {
    beforeAll(async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true, isBanned: false },
      });
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testAdmin)
        .expect(201);

      const admin = await prisma.user.findUnique({
        where: { email: testAdmin.email },
      });
      if (admin) {
        await prisma.user.update({
          where: { id: admin.id },
          data: {
            role: 'ADMIN',
            isVerified: true,
            isBanned: false,
            deletedAt: null,
          },
        });
        await prisma.adminDevice.deleteMany({
          where: { userId: admin.id, deviceId: adminDeviceId },
        });
        await prisma.adminDevice.create({
          data: {
            userId: admin.id,
            deviceId: adminDeviceId,
            deviceName: 'E2E Device',
          },
        });
      }
    });

    it('should login regular user with email/password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      userAccessToken = res.body.data.accessToken;
      userRefreshToken = res.body.data.refreshToken;
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpass' })
        .expect(401);
    });

    it('should fail if user not verified', async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: false },
      });
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(403);
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true },
      });
    });

    it('should fail if user is banned', async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isBanned: true },
      });
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(403);
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isBanned: false },
      });
    });

    it('should login admin with valid deviceId', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
          deviceId: adminDeviceId,
        })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail admin login without deviceId', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testAdmin.email, password: testAdmin.password })
        .expect(400);
    });

    it('should fail admin login with invalid deviceId', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
          deviceId: 'invalid-device',
        })
        .expect(403);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);
      userAccessToken = loginRes.body.data.accessToken;
      userRefreshToken = loginRes.body.data.refreshToken;

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: userRefreshToken })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      userAccessToken = res.body.data.accessToken;
      userRefreshToken = res.body.data.refreshToken;
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: userRefreshToken })
        .expect(204);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: userRefreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password with valid old password', async () => {
      const newPassword = 'NewPass123!';
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ oldPassword: testUser.password, newPassword })
        .expect(204);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: newPassword })
        .expect(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
      // Restore old password
      await prisma.user.update({
        where: { email: testUser.email },
        data: { passwordHash: await bcrypt.hash(testUser.password, 10) },
      });
    });

    it('should fail with wrong old password', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ oldPassword: 'wrong', newPassword: 'NewPass123!' })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 202 even if email not found', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(202);
    });

    it('should send OTP for existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(202);
      const otp = await prisma.otp.findFirst({
        where: { email: testUser.email, type: 'FORGOT_PASSWORD' },
      });
      expect(otp).not.toBeNull();
    });

    it('should rate limit after 3 requests per hour', async () => {
      mockRedisService.reset();
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: testUser.email })
          .expect(202);
      }
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(429);
    });
  });

  describe('POST /auth/reset-password', () => {
    let resetOtp: string;

    beforeEach(async () => {
      const plainOtp = '123456';
      const hashed = await bcrypt.hash(plainOtp, 10);
      await prisma.otp.create({
        data: {
          email: testUser.email,
          otpHash: hashed,
          type: 'FORGOT_PASSWORD',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      resetOtp = plainOtp;
    });

    it('should reset password with valid OTP', async () => {
      const newPassword = 'ResetPass123!';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ email: testUser.email, otp: resetOtp, newPassword })
        .expect(204);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: newPassword })
        .expect(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
      // Restore old password
      await prisma.user.update({
        where: { email: testUser.email },
        data: { passwordHash: await bcrypt.hash(testUser.password, 10) },
      });
    });

    it('should fail with invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ email: testUser.email, otp: '000000', newPassword: 'NewPass' })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('Admin devices endpoints', () => {
    let adminToken: string;

    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
          deviceId: adminDeviceId,
        })
        .expect(200);
      adminToken = loginRes.body.data.accessToken;
    });

    describe('GET /auth/admin/devices', () => {
      it('should allow admin to list devices', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/admin/devices')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should deny non-admin user', async () => {
        await request(app.getHttpServer())
          .get('/auth/admin/devices')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .expect(403);
      });
    });

    describe('POST /auth/admin/devices', () => {
      it('should add a new device for admin', async () => {
        const newDevice = {
          deviceId: extraAdminDeviceId,
          deviceName: 'Laptop',
        };
        const res = await request(app.getHttpServer())
          .post('/auth/admin/devices')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newDevice)
          .expect(201);
        expect(res.body.data.deviceId).toBe(newDevice.deviceId);
      });

      it('should not add duplicate device', async () => {
        await request(app.getHttpServer())
          .post('/auth/admin/devices')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ deviceId: extraAdminDeviceId })
          .expect(409);
      });
    });

    describe('DELETE /auth/admin/devices/:deviceId', () => {
      it('should remove a device', async () => {
        await request(app.getHttpServer())
          .delete(`/auth/admin/devices/${extraAdminDeviceId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);
        const adminUser = await prisma.user.findUnique({
          where: { email: testAdmin.email },
        });
        const device = await prisma.adminDevice.findUnique({
          where: {
            userId_deviceId: {
              userId: adminUser!.id,
              deviceId: extraAdminDeviceId,
            },
          },
        });
        expect(device).toBeNull();
      });
    });
  });

  describe('Admin device OTP flow', () => {
    let adminEmail: string;
    let adminPassword: string;
    let newDeviceId: string;
    let adminUserId: string;

    const requestDeviceOtp = async () => {
      await request(app.getHttpServer())
        .post('/auth/admin/request-device-otp')
        .send({
          email: adminEmail,
          deviceId: newDeviceId,
          deviceName: 'E2E OTP Device',
        })
        .expect(202);
    };

    beforeAll(async () => {
      adminEmail = testAdmin.email;
      adminPassword = testAdmin.password;
      newDeviceId = 'otp-test-device';
      // Get admin user id
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      adminUserId = adminUser!.id;
      // Clean up any existing device
      await prisma.adminDevice.deleteMany({
        where: { userId: adminUserId, deviceId: newDeviceId },
      });
      // Reset mock mail service OTP storage
      mockMailService.reset();
    });

    beforeEach(async () => {
      await prisma.adminDevice.deleteMany({
        where: { userId: adminUserId, deviceId: newDeviceId },
      });
      mockMailService.reset();
    });

    it('should return DEVICE_NOT_AUTHORIZED with requiresOtp flag on login with new device', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
          deviceId: newDeviceId,
        })
        .expect(403);
      expect(res.body.error.code).toBe('DEVICE_NOT_AUTHORIZED');
      expect(res.body.error.details).toHaveProperty('requiresOtp', true);
      expect(res.body.error.details.deviceId).toBe(newDeviceId);
    });

    it('should request OTP for new device', async () => {
      await requestDeviceOtp();
      expect(mockMailService.getOtpForEmail(adminEmail)).toBeDefined();
    });

    it('should fail verification with wrong OTP', async () => {
      await requestDeviceOtp();

      await request(app.getHttpServer())
        .post('/auth/admin/verify-device')
        .send({ email: adminEmail, deviceId: newDeviceId, otp: '000000' })
        .expect(400);
    });

    it('should verify OTP and login', async () => {
      await requestDeviceOtp();

      const otp = mockMailService.getOtpForEmail(adminEmail);
      expect(otp).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/auth/admin/verify-device')
        .send({ email: adminEmail, deviceId: newDeviceId, otp })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Verify device was added
      const device = await prisma.adminDevice.findUnique({
        where: {
          userId_deviceId: {
            userId: adminUserId,
            deviceId: newDeviceId,
          },
        },
      });
      expect(device).not.toBeNull();
      expect(device?.deviceName).toBe('E2E OTP Device');
    });

    it('should now login with the same device without OTP', async () => {
      const otp = mockMailService.getOtpForEmail(adminEmail);
      if (!otp) {
        await requestDeviceOtp();
      }

      const freshOtp = mockMailService.getOtpForEmail(adminEmail);
      expect(freshOtp).toBeDefined();

      await request(app.getHttpServer())
        .post('/auth/admin/verify-device')
        .send({ email: adminEmail, deviceId: newDeviceId, otp: freshOtp })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
          deviceId: newDeviceId,
        })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should logout from all devices and invalidate refresh tokens', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(204);
      // After logout-all, the old refresh token should be invalid
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: userRefreshToken })
        .expect(401);
    });
  });
});
