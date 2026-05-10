import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SettingsResponseDto } from '../dto/settings-response.dto';
import { DEFAULT_SETTINGS } from '../constants/default-settings';
import { UserSettings } from '../interfaces/settings.interface';

@Injectable()
export class SettingsMapper {
  toResponseDto(
    stored: Record<string, unknown> | Partial<UserSettings>,
  ): SettingsResponseDto {
    const merged = { ...DEFAULT_SETTINGS, ...stored };
    return plainToInstance(SettingsResponseDto, merged, {
      excludeExtraneousValues: true,
    });
  }
}
