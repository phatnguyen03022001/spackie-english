import { validateSettings } from '@modules/settings/validators/settings.validator';

describe('validateSettings', () => {
  it('should return no errors for valid settings', () => {
    const errors = validateSettings({
      reminderEnabled: true,
      reminderTime: '08:00',
    });
    expect(errors).toHaveLength(0);
  });

  it('should return error if reminder enabled without reminderTime', () => {
    const errors = validateSettings({
      reminderEnabled: true,
      reminderTime: undefined,
    });
    expect(errors).toContain(
      'reminderTime is required when reminderEnabled is true',
    );
  });

  it('should return error when reminderEnabled true but reminderTime missing', () => {
    const errors = validateSettings({
      reminderEnabled: true,
      reminderTime: undefined,
    });
    expect(errors).toContain(
      'reminderTime is required when reminderEnabled is true',
    );
  });

  it('should allow reminder disabled without reminderTime', () => {
    const errors = validateSettings({
      reminderEnabled: false,
      reminderTime: undefined,
    });
    expect(errors).toHaveLength(0);
  });

  it('should return no errors for empty partial settings', () => {
    const errors = validateSettings({});
    expect(errors).toHaveLength(0);
  });
});
