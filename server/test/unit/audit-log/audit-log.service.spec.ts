// test/unit/audit-log/audit-log.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { AuditLogRepository } from '@modules/audit-log/audit-log.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from '@common/filters/business.exception';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<AuditLogRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let cacheManager: any;

  const mockRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: AuditLogRepository, useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: 'ICacheManager', useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get(AuditLogService);
    repository = module.get(AuditLogRepository);
    eventEmitter = module.get(EventEmitter2);
    cacheManager = module.get('ICacheManager');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const logData = {
      userId: 'admin-1',
      action: 'USER_DELETED',
      targetId: 'user-2',
      details: { reason: 'GDPR request' },
    };

    it('should create audit log and emit event', async () => {
      const createdLog = { id: 'log-1', ...logData };
      mockRepository.create.mockResolvedValue(createdLog);

      const result = await service.create(logData);

      expect(repository.create).toHaveBeenCalledWith(logData);
      expect(eventEmitter.emit).toHaveBeenCalledWith('audit_log.created', {
        id: 'log-1',
        ...logData,
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('log-1');
    });
  });

  describe('findAll', () => {
    const query = { page: 1, limit: 20 };

    it('should return cached data if available', async () => {
      const cachedResponse = {
        data: [{ id: 'log-1', action: 'USER_DELETED' }],
        total: 1,
      };
      mockCacheManager.get.mockResolvedValue(cachedResponse);

      const result = await service.findAll(query);

      expect(result).toEqual(cachedResponse);
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache result', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findMany.mockResolvedValue({
        logs: [
          {
            id: 'log-1',
            action: 'USER_DELETED',
            userId: 'admin-1',
            createdAt: new Date(),
          },
        ],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(repository.findMany).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should apply filters when present', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findMany.mockResolvedValue({ logs: [], total: 0 });

      const filteredQuery = {
        page: 1,
        limit: 10,
        userId: 'admin-1',
        action: 'USER_DELETED',
        sort: 'createdAt:desc',
      };
      await service.findAll(filteredQuery);

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'USER_DELETED',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return audit log if found', async () => {
      const log = { id: 'log-1', action: 'USER_DELETED' };
      mockRepository.findById.mockResolvedValue(log);

      const result = await service.findById('log-1');

      expect(repository.findById).toHaveBeenCalledWith('log-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('log-1');
    });

    it('should throw if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        BusinessException,
      );
    });
  });
});
