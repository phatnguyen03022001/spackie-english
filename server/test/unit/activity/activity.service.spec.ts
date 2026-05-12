// test/unit/activity/activity.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from '@modules/activity/activity.service';
import { ActivityRepository } from '@modules/activity/activity.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ActivityService', () => {
  let service: ActivityService;
  let repository: jest.Mocked<ActivityRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let cacheManager: any;

  const mockRepository = {
    create: jest.fn(),
    findByUser: jest.fn(),
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
        ActivityService,
        { provide: ActivityRepository, useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: 'ICacheManager', useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get(ActivityService);
    repository = module.get(ActivityRepository);
    eventEmitter = module.get(EventEmitter2);
    cacheManager = module.get('ICacheManager');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('record', () => {
    const recordData = {
      userId: 'user-1',
      type: 'LOGIN',
      targetId: null,
      details: { ip: '127.0.0.1' },
    };

    it('should create activity and emit event', async () => {
      const createdActivity = { id: 'act-1', ...recordData };
      mockRepository.create.mockResolvedValue(createdActivity);

      const result = await service.record(recordData);

      expect(repository.create).toHaveBeenCalledWith(recordData);
      expect(cacheManager.delPattern).toHaveBeenCalledWith(
        'activity:user-1:list:*',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('activity.created', {
        id: 'act-1',
        ...recordData,
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('act-1');
    });

    it('should handle optional targetId and details', async () => {
      const minimalData = { userId: 'user-1', type: 'LOGOUT' };
      const createdActivity = {
        id: 'act-2',
        ...minimalData,
        targetId: null,
        details: {},
      };
      mockRepository.create.mockResolvedValue(createdActivity);

      const result = await service.record(minimalData);

      expect(repository.create).toHaveBeenCalledWith(minimalData);
      expect(result).toBeDefined();
    });
  });

  describe('findByUser', () => {
    const userId = 'user-1';
    const query = { page: 1, limit: 20 };

    it('should return cached data if available', async () => {
      const cachedResponse = {
        data: [{ id: 'act-1', type: 'LOGIN' }],
        total: 1,
      };
      mockCacheManager.get.mockResolvedValue(cachedResponse);

      const result = await service.findByUser(userId, query);

      expect(result).toEqual(cachedResponse);
      expect(repository.findByUser).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache result', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findByUser.mockResolvedValue({
        activities: [
          {
            id: 'act-1',
            type: 'LOGIN',
            userId: 'user-1',
            createdAt: new Date(),
          },
        ],
        total: 1,
      });

      const result = await service.findByUser(userId, query);

      expect(repository.findByUser).toHaveBeenCalledWith(
        userId,
        0, // skip = (1-1) * 20
        20,
        undefined, // no type filter
      );
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by type', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findByUser.mockResolvedValue({
        activities: [],
        total: 0,
      });

      const queryWithType = { page: 1, limit: 20, type: 'LOGIN' };
      await service.findByUser(userId, queryWithType);

      expect(repository.findByUser).toHaveBeenCalledWith(
        userId,
        0,
        20,
        'LOGIN',
      );
    });
  });
});
