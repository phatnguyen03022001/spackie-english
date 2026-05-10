import { SettingsMapper } from '@modules/settings/mappers/settings.mapper';
import { DEFAULT_SETTINGS } from '@modules/settings/constants/default-settings';

describe('SettingsMapper', () => {
  let mapper: SettingsMapper;

  beforeEach(() => {
    mapper = new SettingsMapper();
  });

  it('should return default when stored is empty', () => {
    const result = mapper.toResponseDto({});
    expect(result).toMatchObject(DEFAULT_SETTINGS);
  });

  it('should override default with stored values', () => {
    const stored = { theme: 'dark', language: 'en' };
    const result = mapper.toResponseDto(stored);
    expect(result.theme).toBe('dark');
    expect(result.language).toBe('en');
    expect(result.reminderEnabled).toBe(DEFAULT_SETTINGS.reminderEnabled);
  });

  it('should ignore extra fields not in DTO', () => {
    const stored = { unknown: 'field' } as any;
    const result = mapper.toResponseDto(stored);
    expect(result).not.toHaveProperty('unknown');
  });

  it('should return instance of SettingsResponseDto', () => {
    const { SettingsResponseDto } = jest.requireActual(
      '@modules/settings/dto/settings-response.dto',
    );
    const result = mapper.toResponseDto({});
    expect(result).toBeInstanceOf(SettingsResponseDto);
  });
});
