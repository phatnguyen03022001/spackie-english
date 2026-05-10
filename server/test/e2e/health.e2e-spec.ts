import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { RedisHealthIndicator } from '@infrastructure/redis/redis.health';
import { PusherHealthIndicator } from '@infrastructure/pusher/pusher.health';
import { MailHealthIndicator } from '@infrastructure/mail/mail.health';
import { StorageHealthIndicator } from '@infrastructure/storage/storage.health';
import { PaymentHealthIndicator } from '@infrastructure/payment/payment.health';
import { DeepSeekHealthIndicator } from '@infrastructure/third-party/deepseek.health';
import { MapTilerHealthIndicator } from '@infrastructure/third-party/maptiler.health';
import { PrismaHealthIndicator } from '@database/prisma.health';

// Mock each health indicator to always return healthy
const mockRedisHealth = {
  isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
};
const mockPusherHealth = {
  isHealthy: jest.fn().mockResolvedValue({ pusher: { status: 'up' } }),
};
const mockMailHealth = {
  isHealthy: jest.fn().mockResolvedValue({ mail: { status: 'up' } }),
};
const mockStorageHealth = {
  isHealthy: jest.fn().mockResolvedValue({ storage: { status: 'up' } }),
};
const mockPaymentHealth = {
  isHealthy: jest.fn().mockResolvedValue({ payment: { status: 'up' } }),
};
const mockDeepseekHealth = {
  isHealthy: jest.fn().mockResolvedValue({ deepseek: { status: 'up' } }),
};
const mockMaptilerHealth = {
  isHealthy: jest.fn().mockResolvedValue({ maptiler: { status: 'up' } }),
};
const mockPrismaHealth = {
  isHealthy: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
};

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisHealthIndicator)
      .useValue(mockRedisHealth)
      .overrideProvider(PusherHealthIndicator)
      .useValue(mockPusherHealth)
      .overrideProvider(MailHealthIndicator)
      .useValue(mockMailHealth)
      .overrideProvider(StorageHealthIndicator)
      .useValue(mockStorageHealth)
      .overrideProvider(PaymentHealthIndicator)
      .useValue(mockPaymentHealth)
      .overrideProvider(DeepSeekHealthIndicator)
      .useValue(mockDeepseekHealth)
      .overrideProvider(MapTilerHealthIndicator)
      .useValue(mockMaptilerHealth)
      .overrideProvider(PrismaHealthIndicator)
      .useValue(mockPrismaHealth)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 and status ok', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('info');
    expect(response.body.info).toHaveProperty('database');
    expect(response.body.info).toHaveProperty('redis');
  });
});
