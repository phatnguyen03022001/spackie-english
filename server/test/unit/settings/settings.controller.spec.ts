import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from '@modules/settings/settings.controller';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingsResponseDto } from '@modules/settings/dto/settings-response.dto';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { DEFAULT_SETTINGS } from '@modules/settings/constants/default-settings';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: jest.Mocked<SettingsService>;

  const mockUser = { id: 'user123', email: 'test@test.com', role: 'USER' };

  beforeEach(async () => {
    const mockSettingsService = {
      findByUserId: jest.fn(),
      update: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    settingsService = module.get(SettingsService);
  });

  describe('findMySettings', () => {
    it('should return current user settings', async () => {
      const expected = new SettingsResponseDto(DEFAULT_SETTINGS);
      settingsService.findByUserId.mockResolvedValue(expected);

      const result = await controller.findMySettings(mockUser as any);

      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toBe(expected);
      expect(settingsService.findByUserId).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateMySettings', () => {
    it('should update and return settings', async () => {
      const dto = { language: 'en' };
      const expected = new SettingsResponseDto({
        ...DEFAULT_SETTINGS,
        language: 'en',
      });
      settingsService.update.mockResolvedValue(expected);

      const result = await controller.updateMySettings(
        mockUser as any,
        dto as any,
      );

      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data.language).toBe('en');
      expect(settingsService.update).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('resetMySettings', () => {
    it('should reset and return defaults', async () => {
      const expected = new SettingsResponseDto(DEFAULT_SETTINGS);
      settingsService.reset.mockResolvedValue(expected);

      const result = await controller.resetMySettings(mockUser as any);

      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toEqual(expected);
      expect(settingsService.reset).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findByUserId (admin)', () => {
    it('should return settings for any user', async () => {
      const targetUserId = 'otherUser456';
      const expected = new SettingsResponseDto(DEFAULT_SETTINGS);
      settingsService.findByUserId.mockResolvedValue(expected);

      const result = await controller.findByUserId(targetUserId);

      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(settingsService.findByUserId).toHaveBeenCalledWith(targetUserId);
    });
  });
});
