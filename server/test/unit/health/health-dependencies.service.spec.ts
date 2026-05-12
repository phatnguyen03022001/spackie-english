// test/unit/health/health-dependencies.service.spec.ts
import { HealthDependenciesService } from '@modules/health/health-dependencies.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { PrismaService } from '@database/prisma.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';
import { LoggerService } from '@common/logger/logger.service';

describe('HealthDependenciesService', () => {
  let service: HealthDependenciesService;

  const mockRedisService = { ping: jest.fn() };
  const mockPrisma = { isHealthy: jest.fn() };
  const mockPusherService = { ping: jest.fn() };
  const mockMailService = { ping: jest.fn() };
  const mockStorageService = { ping: jest.fn() };
  const mockDeepseekClient = { ping: jest.fn() };
  const mockPixabayClient = { ping: jest.fn() };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new HealthDependenciesService(
      mockRedisService as any,
      mockPrisma as any,
      mockPusherService as any,
      mockMailService as any,
      mockStorageService as any,
      mockDeepseekClient as any,
      mockPixabayClient as any,
      mockLogger as any,
    );
  });

  describe('checkAll', () => {
    it('should return up status for all dependencies when healthy', async () => {
      mockRedisService.ping.mockResolvedValue(undefined);
      mockPrisma.isHealthy.mockResolvedValue(true);
      mockPusherService.ping.mockResolvedValue(true);
      mockMailService.ping.mockResolvedValue(undefined);
      mockStorageService.ping.mockResolvedValue(undefined);
      mockDeepseekClient.ping.mockResolvedValue(undefined);
      mockPixabayClient.ping.mockResolvedValue(undefined);

      const results = await service.checkAll();

      const statusMap = new Map(results.map((r) => [r.name, r.status]));
      expect(statusMap.get('redis')).toBe('up');
      expect(statusMap.get('database')).toBe('up');
      expect(statusMap.get('pusher')).toBe('up');
      expect(statusMap.get('mail')).toBe('up');
      expect(statusMap.get('storage')).toBe('up');
      expect(statusMap.get('deepseek')).toBe('up');
      expect(statusMap.get('pixabay')).toBe('up');
    });

    it('should return down status for failing dependencies', async () => {
      mockRedisService.ping.mockRejectedValue(new Error('Connection refused'));
      mockPrisma.isHealthy.mockRejectedValue(new Error('DB down'));
      mockPusherService.ping.mockRejectedValue(new Error('Pusher error'));
      mockMailService.ping.mockRejectedValue(new Error('SMTP error'));
      mockStorageService.ping.mockRejectedValue(new Error('S3 error'));
      mockDeepseekClient.ping.mockRejectedValue(new Error('API error'));
      mockPixabayClient.ping.mockRejectedValue(new Error('Rate limited'));

      const results = await service.checkAll();

      const statusMap = new Map(results.map((r) => [r.name, r.status]));
      expect(statusMap.get('redis')).toBe('down');
      expect(statusMap.get('database')).toBe('down');
      expect(statusMap.get('pusher')).toBe('down');
      expect(statusMap.get('mail')).toBe('down');
      expect(statusMap.get('storage')).toBe('down');
      expect(statusMap.get('deepseek')).toBe('down');
      expect(statusMap.get('pixabay')).toBe('down');
    });

    it('should include latencyMs for successful checks', async () => {
      mockRedisService.ping.mockResolvedValue(undefined);
      mockPrisma.isHealthy.mockResolvedValue(true);
      mockPusherService.ping.mockResolvedValue(true);
      mockMailService.ping.mockResolvedValue(undefined);
      mockStorageService.ping.mockResolvedValue(undefined);
      mockDeepseekClient.ping.mockResolvedValue(undefined);
      mockPixabayClient.ping.mockResolvedValue(undefined);

      const results = await service.checkAll();

      for (const r of results) {
        if (r.status === 'up') {
          expect(r.latencyMs).toBeDefined();
          expect(r.latencyMs).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
