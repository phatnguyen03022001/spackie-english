// src/modules/settings/interfaces/settings.interface.ts

export interface UserSettings {
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm format
  theme: 'light' | 'dark' | 'system';
  language: string; // ISO code like 'vi', 'en'
  pushEnabled: boolean;
  emailNotificationEnabled: boolean;
}
