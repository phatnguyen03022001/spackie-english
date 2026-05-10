import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    mockClient = {
      ping: jest.fn(),
      quit: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisService,
          useFactory: () => {
            const configService = new ConfigService({
              'redis.url': 'redis://localhost:6379',
              REDIS_CONNECT_TIMEOUT: '10000',
              REDIS_COMMAND_TIMEOUT: '5000',
            });
            const svc = new RedisService(configService, mockLogger as any);
            (svc as any).client = mockClient;
            return svc;
          },
        },
      ],
    }).compile();

    service = module.get(RedisService);
    logger = mockLogger as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ping', () => {
    it('should return pong from Redis client', async () => {
      mockClient.ping.mockResolvedValue('PONG');
      const result = await service.ping();
      expect(mockClient.ping).toHaveBeenCalled();
      expect(result).toBe('PONG');
    });

    it('should propagate error from Redis client', async () => {
      mockClient.ping.mockRejectedValue(new Error('Connection refused'));
      await expect(service.ping()).rejects.toThrow('Connection refused');
    });
  });

  describe('onModuleInit', () => {
    it('should connect to Redis', async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Redis connected');
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis client', async () => {
      mockClient.quit.mockResolvedValue('OK');
      await service.onModuleDestroy();
      expect(mockClient.quit).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Redis disconnected');
    });
  });
});
