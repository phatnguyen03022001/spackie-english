import {
  validateMimeType,
  validateFileSize,
  getResourceType,
} from '@modules/file-manager/utils/file-validator.util';
import { FileRefType } from '@prisma/client';

describe('file-validator', () => {
  describe('validateMimeType', () => {
    it('should accept valid image for AVATAR', () => {
      const result = validateMimeType('image/png', FileRefType.AVATAR);
      expect(result.valid).toBe(true);
    });

    it('should reject non-image for AVATAR', () => {
      const result = validateMimeType('audio/mpeg', FileRefType.AVATAR);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Image files must be one of');
    });

    it('should accept valid audio for CARD_AUDIO', () => {
      const result = validateMimeType('audio/mpeg', FileRefType.CARD_AUDIO);
      expect(result.valid).toBe(true);
    });

    it('should reject non-audio for CARD_AUDIO', () => {
      const result = validateMimeType('image/jpeg', FileRefType.CARD_AUDIO);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Audio files must be one of');
    });
  });

  describe('validateFileSize', () => {
    it('should accept size under limit for image', () => {
      const result = validateFileSize(4 * 1024 * 1024, 'image/jpeg');
      expect(result.valid).toBe(true);
    });

    it('should reject size over 5MB for image', () => {
      const result = validateFileSize(6 * 1024 * 1024, 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Image file size exceeds maximum of 5MB');
    });

    it('should reject size over 10MB for audio', () => {
      const result = validateFileSize(11 * 1024 * 1024, 'audio/mpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Audio file size exceeds maximum of 10MB');
    });
  });

  describe('getResourceType', () => {
    it('should return image for image/*', () => {
      expect(getResourceType('image/png')).toBe('image');
      expect(getResourceType('image/jpeg')).toBe('image');
    });
    it('should return audio for audio/*', () => {
      expect(getResourceType('audio/mpeg')).toBe('audio');
    });
    it('should return raw otherwise', () => {
      expect(getResourceType('application/pdf')).toBe('raw');
    });
  });
});
