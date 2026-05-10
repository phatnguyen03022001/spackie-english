// src/modules/settings/dto/update-settings.dto.ts
import {
  IsBoolean,
  IsString,
  IsOptional,
  Matches,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Enable daily reminder notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Reminder time in HH:mm format (required if reminderEnabled=true)',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'reminderTime must be in HH:mm format',
  })
  reminderTime?: string;

  @ApiPropertyOptional({
    description: 'UI theme preference',
    example: 'light',
    enum: ['light', 'dark', 'system'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({
    description: 'User language preference (ISO 639-1 code)',
    example: 'vi',
    enum: ['vi', 'en', 'ja', 'ko', 'zh'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['vi', 'en', 'ja', 'ko', 'zh'], {
    message: 'language must be one of: vi, en, ja, ko, zh',
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'Allow push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Allow email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationEnabled?: boolean;
}
