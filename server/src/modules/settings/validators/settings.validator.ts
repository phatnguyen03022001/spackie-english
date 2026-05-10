// src/modules/settings/validators/settings.validator.ts
import type { UserSettings } from '@modules/settings/interfaces/settings.interface';

/**
 * Cross-field validation for settings.
 * Returns an array of error messages, or empty array if valid.
 */
export function validateSettings(settings: Partial<UserSettings>): string[] {
  const errors: string[] = [];

  // If reminder is enabled, reminderTime should be present
  if (settings.reminderEnabled === true && !settings.reminderTime) {
    errors.push('reminderTime is required when reminderEnabled is true');
  }

  return errors;
}
