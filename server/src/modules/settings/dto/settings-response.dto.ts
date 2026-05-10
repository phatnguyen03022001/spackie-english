import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SettingsResponseDto {
  @ApiProperty({
    description: 'Enable daily reminder notifications',
    example: true,
  })
  @Expose()
  reminderEnabled!: boolean;

  @ApiProperty({
    description:
      'Reminder time in HH:mm format (required if reminderEnabled=true)',
    example: '08:00',
  })
  @Expose()
  reminderTime!: string;

  @ApiProperty({
    description: 'UI theme preference',
    example: 'light',
    enum: ['light', 'dark', 'system'],
  })
  @Expose()
  theme!: 'light' | 'dark' | 'system';

  @ApiProperty({
    description: 'User language preference (ISO 639-1 code)',
    example: 'vi',
  })
  @Expose()
  language!: string;

  @ApiProperty({
    description: 'Allow push notifications',
    example: true,
  })
  @Expose()
  pushEnabled!: boolean;

  @ApiProperty({
    description: 'Allow email notifications',
    example: true,
  })
  @Expose()
  emailNotificationEnabled!: boolean;

  constructor(partial: Partial<SettingsResponseDto>) {
    Object.assign(this, partial);
  }
}
