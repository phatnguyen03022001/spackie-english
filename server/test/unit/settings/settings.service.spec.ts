import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingsRepository } from '@modules/settings/settings.repository';
import { SettingsMapper } from '@modules/settings/mappers/settings.mapper';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { DEFAULT_SETTINGS } from '@modules/settings/constants/default-settings';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SettingsService', () => {
  let service: SettingsService;
  let settingsRepository: jest.Mocked<SettingsRepository>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUserId = 'user123';

  beforeEach(async () => {
    const mockSettingsRepository = {
      findByUserId: jest.fn(),
      update: jest.fn(),
      reset: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      reset: jest.fn(),
      ping: jest.fn(),
    };
    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        SettingsMapper,
        { provide: SettingsRepository, useValue: mockSettingsRepository },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: LoggerService, useValue: mockLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    eventEmitter = module.get(EventEmitter2);

    service = module.get<SettingsService>(SettingsService);
    settingsRepository = module.get(SettingsRepository);
    cacheManager = module.get('ICacheManager');
  });

  describe('findByUserId', () => {
    it('should return cached settings if available', async () => {
      const cached = { ...DEFAULT_SETTINGS };
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.findByUserId(mockUserId);

      expect(result).toEqual(cached);
      expect(settingsRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('should merge stored settings with defaults and cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      settingsRepository.findByUserId.mockResolvedValue({ theme: 'dark' });

      const result = await service.findByUserId(mockUserId);

      expect(result.theme).toBe('dark');
      expect(result.reminderEnabled).toBe(true); // from defaults
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should return full defaults when no stored settings', async () => {
      cacheManager.get.mockResolvedValue(null);
      settingsRepository.findByUserId.mockResolvedValue({});

      const result = await service.findByUserId(mockUserId);

      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('update', () => {
    it('should partial update and return merged settings', async () => {
      // First call inside update(), second call inside findByUserId() at the end
      settingsRepository.findByUserId
        .mockResolvedValueOnce({ theme: 'dark' })
        .mockResolvedValueOnce({ theme: 'dark', language: 'en' });
      cacheManager.get.mockResolvedValue(null);

      const result = await service.update(mockUserId, {
        language: 'en',
      });

      expect(result.language).toBe('en');
      expect(result.theme).toBe('dark'); // kept from stored
      expect(result.reminderEnabled).toBe(true); // from defaults
      expect(settingsRepository.update).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('settings.updated', {
        userId: mockUserId,
        updatedFields: ['language'],
      });
    });

    it('should throw validation error if reminder enabled without time', async () => {
      settingsRepository.findByUserId.mockResolvedValue({});

      await expect(
        service.update(mockUserId, {
          reminderEnabled: true,
          reminderTime: undefined,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should persist only diff from defaults', async () => {
      settingsRepository.findByUserId.mockResolvedValue({});

      await service.update(mockUserId, {
        language: 'en',
        theme: 'dark',
      });

      const stored = settingsRepository.update.mock.calls[0][1];
      expect(stored).toEqual({
        language: 'en',
        theme: 'dark',
      });
      expect(stored.reminderEnabled).toBeUndefined(); // same as default
    });

    it('should update reminderEnabled and reminderTime together', async () => {
      settingsRepository.findByUserId
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          reminderEnabled: true,
          reminderTime: '09:00',
        });
      cacheManager.get.mockResolvedValue(null);

      const result = await service.update(mockUserId, {
        reminderEnabled: true,
        reminderTime: '09:00',
      });

      expect(result.reminderEnabled).toBe(true);
      expect(result.reminderTime).toBe('09:00');
      // reminderEnabled matches default so it's excluded from diff
      expect(settingsRepository.update).toHaveBeenCalledWith(mockUserId, {
        reminderTime: '09:00',
      });
    });

    it('should store empty object when all fields equal defaults', async () => {
      settingsRepository.findByUserId
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      cacheManager.get.mockResolvedValue(null);

      await service.update(mockUserId, DEFAULT_SETTINGS);
      expect(settingsRepository.update).toHaveBeenCalledWith(mockUserId, {});
    });

    it('should invalidate global cache patterns on update', async () => {
      settingsRepository.findByUserId
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ language: 'en' });
      cacheManager.get.mockResolvedValue(null);

      await service.update(mockUserId, { language: 'en' });

      expect(cacheManager.delPattern).toHaveBeenCalledWith('cache:*settings*');
      expect(cacheManager.delPattern).toHaveBeenCalledWith('*settings*');
    });
  });

  describe('reset', () => {
    it('should reset to defaults', async () => {
      settingsRepository.reset.mockResolvedValue(undefined);

      const result = await service.reset(mockUserId);

      expect(settingsRepository.reset).toHaveBeenCalledWith(mockUserId);
      expect(cacheManager.del).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('settings.updated', {
        userId: mockUserId,
        updatedFields: ['*'],
      });
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });
});
