// src/modules/file-manager/constants/file-limits.const.ts

export const FILE_LIMITS = {
  MAX_USER_QUOTA_BYTES: 50 * 1024 * 1024, // 50 MB
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_AUDIO_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    audio: ['audio/mpeg', 'audio/wav'],
  },
} as const;

export const FILE_ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_QUOTA_EXCEEDED: 'FILE_QUOTA_EXCEEDED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_FORBIDDEN: 'FILE_FORBIDDEN',
  FILE_IN_USE: 'FILE_IN_USE',
} as const;
