// test/unit/rate-limit/rate-limit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from '@modules/rate-limit/rate-limit.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@infrastructure/redis/redis.service';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let prisma: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let cacheManager: any;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    client: {
      get: jest.fn(),
    },
    ping: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(RateLimitService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
    cacheManager = module.get('ICacheManager');
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRateLimitInfo', () => {
    const userId = 'user-1';

    it('should return cached info if available', async () => {
      const cachedInfo = {
        tier: 'FREE',
        limits: {
          short: { limit: 10, ttl: 1, remaining: 8 },
          medium: { limit: 100, ttl: 60, remaining: 95 },
          long: { limit: 1000, ttl: 3600, remaining: 1000 },
        },
      };
      mockCacheManager.get.mockResolvedValue(cachedInfo);

      const result = await service.getRateLimitInfo(userId);

      expect(result).toEqual(cachedInfo);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return FREE tier for regular user without subscription', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'USER',
        subscription: null,
      });
      mockConfigService.get.mockReturnValue([]);

      const result = await service.getRateLimitInfo(userId);

      expect(result.tier).toBe('FREE');
    });

    it('should return VIP tier for user with active subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'USER',
        subscription: {
          status: 'ACTIVE',
          expiresAt: futureDate,
        },
      });
      mockConfigService.get.mockReturnValue([]);

      const result = await service.getRateLimitInfo(userId);

      expect(result.tier).toBe('VIP');
    });

    it('should return ADMIN tier for admin user', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'ADMIN',
        subscription: null,
      });
      mockConfigService.get.mockReturnValue([]);

      const result = await service.getRateLimitInfo(userId);

      expect(result.tier).toBe('ADMIN');
    });

    it('should throw if user not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getRateLimitInfo(userId)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should return remaining hits from Redis', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'USER',
        subscription: null,
      });
      mockConfigService.get.mockReturnValue([
        { name: 'short', ttl: 1, limit: 10 },
      ]);
      mockRedisService.client.get.mockResolvedValue('3');

      const result = await service.getRateLimitInfo(userId);

      expect(result.limits.short.remaining).toBe(7); // 10 - 3
      expect(result.limits.short.limit).toBe(10);
      expect(result.limits.short.ttl).toBe(1);
    });

    it('should handle error and throw BusinessException', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis down'));

      await expect(service.getRateLimitInfo(userId)).rejects.toThrow(
        BusinessException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
