import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import * as crypto from 'crypto';
import {
  createMockRedisService,
  createMockMailService,
  createMockPusherService,
  createMockStorageService,
  createMockQueue,
  QUEUE_NAMES,
} from './support/test-doubles';
import { getQueueToken } from '@nestjs/bull';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let mockPayOSProvider: any;
  const checksumKey = 'e2e-payos-checksum-key';

  const createWebhookSignature = (
    payload: Record<string, string | number>,
  ): string => {
    const sortedKeys = Object.keys(payload).sort();
    const signString = sortedKeys
      .map((key) => `${String(key)}=${String(payload[key])}`)
      .join('&');

    return crypto
      .createHmac('sha256', checksumKey)
      .update(signString)
      .digest('hex');
  };

  beforeAll(async () => {
    process.env.PAYOS_CHECKSUM_KEY = checksumKey;

    mockPayOSProvider = {
      createPayment: jest.fn().mockResolvedValue({
        paymentUrl: 'https://payos.vn/checkout/ORDER123',
        orderId: 'ORDER123',
        payosPaymentId: 'PAYLINK123',
      }),
      verifyWebhook: jest.fn().mockReturnValue(true),
      ping: jest.fn().mockResolvedValue(undefined),
      getPaymentStatus: jest.fn().mockResolvedValue({}),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(createMockRedisService())
      .overrideProvider(MailService)
      .useValue(createMockMailService())
      .overrideProvider('PAYMENT_PROVIDER')
      .useValue(mockPayOSProvider)
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
    const email = `payment_e2e_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Test123!', name: 'Payer' })
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
    const adminEmail = `admin_pay_${Date.now()}@test.com`;
    const adminDeviceId = 'payment-admin-device';
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
        deviceName: 'Payment E2E Device',
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /payment/create', () => {
    it('should create a payment order and return checkout URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/payment/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          plan: 'monthly',
          amount: 99000,
        })
        .expect(201);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(res.body.data.orderCode).toBeDefined();
      expect(res.body.data.checkoutUrl).toBeDefined();
    });
  });

  describe('GET /payment/subscription', () => {
    it('should return current subscription (or NONE)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment/subscription')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBeDefined();
    });
  });

  describe('GET /payment/history', () => {
    it('should return payment history', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment/history')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body).toBeDefined();
      // TransformInterceptor wraps response in { success: true, data: ... }
      expect(res.body.data).toBeDefined();
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('POST /payment/subscription/cancel', () => {
    it('should return 404 when no active subscription', async () => {
      const res = await request(app.getHttpServer())
        .post('/payment/subscription/cancel')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(res.body).toBeDefined();
    });
  });

  describe('POST /payment/webhook/payos', () => {
    it('should reject webhook with invalid signature', async () => {
      const res = await request(app.getHttpServer())
        .post('/payment/webhook/payos')
        .send({
          orderCode: 'ORDER123',
          status: 'SUCCESS',
          signature: 'invalid-signature',
        })
        .expect(200);
      expect(res.body.data.error).toBe('Invalid signature');
    });

    it('should ignore non-success payment status', async () => {
      const payload = {
        orderCode: 'ORDER456',
        status: 'FAILED',
      };
      const res = await request(app.getHttpServer())
        .post('/payment/webhook/payos')
        .send({
          ...payload,
          signature: createWebhookSignature(payload),
        })
        .expect(200);
      expect(res.body.message).toBe('Payment not successful, ignored');
    });

    it('should acknowledge successful payment webhook', async () => {
      const payload = {
        orderCode: 'ORDER789',
        status: 'SUCCESS',
        amount: 99000,
        description: 'Payment for monthly plan',
      };
      const res = await request(app.getHttpServer())
        .post('/payment/webhook/payos')
        .send({
          ...payload,
          signature: createWebhookSignature(payload),
        })
        .expect(200);
      expect(res.body.message).toBe('Webhook received, processing');
    });
  });

  describe('Admin endpoints', () => {
    it('should list all subscriptions for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should grant VIP subscription for admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/subscriptions/grant')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          plan: 'monthly',
          durationDays: 30,
        })
        .expect(201);

      expect(res.body).toBeDefined();
    });

    it('should reject regular user from admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
