import { Test, TestingModule } from '@nestjs/testing';
import { EmailQuotaService } from '@modules/auth/email-quota.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { LoggerService } from '@common/logger/logger.service';

describe('EmailQuotaService', () => {
  let service: EmailQuotaService;
  let redisClient: any;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    redisClient = {
      get: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
    };
    logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQuotaService,
        {
          provide: RedisService,
          useValue: { client: redisClient },
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get(EmailQuotaService);
  });

  describe('canSend', () => {
    it('should allow sending if under daily limit', async () => {
      redisClient.get.mockResolvedValue('100');
      const canSend = await service.canSend('otp');
      expect(canSend).toBe(true);
    });

    it('should reject if over daily limit (300)', async () => {
      redisClient.get.mockResolvedValue('300');
      const canSend = await service.canSend('otp');
      expect(canSend).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Email quota exceeded'),
      );
    });

    it('should reject low-priority emails (broadcast) near quota (>=240)', async () => {
      redisClient.get.mockResolvedValue('250');
      const canSendBroadcast = await service.canSend('broadcast');
      expect(canSendBroadcast).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('skipping broadcast email'),
      );
    });

    it('should allow high-priority emails (otp) even when near quota (>=240)', async () => {
      redisClient.get.mockResolvedValue('250');
      const canSendOtp = await service.canSend('otp');
      expect(canSendOtp).toBe(true);
    });

    it('should allow high-priority emails (payment) even when near quota (>=240)', async () => {
      redisClient.get.mockResolvedValue('250');
      const canSendPayment = await service.canSend('payment');
      expect(canSendPayment).toBe(true);
    });
  });

  describe('increment', () => {
    it('should increment atomically using INCR', async () => {
      redisClient.incr.mockResolvedValue(101);
      await service.increment();
      const today = new Date().toISOString().slice(0, 10);
      expect(redisClient.incr).toHaveBeenCalledWith(`quota:email:${today}`);
    });

    it('should set TTL to 86400 seconds when newCount === 1 (first increment of the day)', async () => {
      redisClient.incr.mockResolvedValue(1);
      await service.increment();
      const today = new Date().toISOString().slice(0, 10);
      expect(redisClient.expire).toHaveBeenCalledWith(
        `quota:email:${today}`,
        86400,
      );
    });

    it('should NOT set TTL when newCount > 1', async () => {
      redisClient.incr.mockResolvedValue(2);
      await service.increment();
      expect(redisClient.expire).not.toHaveBeenCalled();
    });

    it('should log warning when count reaches warning threshold (>=270)', async () => {
      redisClient.incr.mockResolvedValue(270);
      await service.increment();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Email quota nearly exhausted: 270/300'),
      );
    });

    it('should not log warning if count is below threshold', async () => {
      redisClient.incr.mockResolvedValue(200);
      await service.increment();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentCount', () => {
    it('should return current count from Redis when key exists', async () => {
      redisClient.get.mockResolvedValue('42');
      const count = await service.getCurrentCount();
      expect(count).toBe(42);
    });

    it('should return 0 if key does not exist in Redis', async () => {
      redisClient.get.mockResolvedValue(null);
      const count = await service.getCurrentCount();
      expect(count).toBe(0);
    });
  });
});
