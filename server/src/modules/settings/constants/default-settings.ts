// src/modules/settings/constants/default-settings.ts
import type { UserSettings } from '@modules/settings/interfaces/settings.interface';

export const DEFAULT_SETTINGS: UserSettings = {
  reminderEnabled: true,
  reminderTime: '08:00',
  theme: 'light',
  language: 'vi',
  pushEnabled: true,
  emailNotificationEnabled: true,
};
