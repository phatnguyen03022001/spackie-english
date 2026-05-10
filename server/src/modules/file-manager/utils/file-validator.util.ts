// src/modules/file-manager/utils/file-validator.util.ts

import type { FileRefType } from '@prisma/client';
import { FILE_LIMITS } from '@modules/file-manager/constants/file-limits.const';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ALL_ALLOWED_MIME_TYPES: readonly string[] = [
  ...FILE_LIMITS.ALLOWED_MIME_TYPES.image,
  ...FILE_LIMITS.ALLOWED_MIME_TYPES.audio,
];

/**
 * Validate file MIME type against allowed types.
 */
export function validateMimeType(
  mimeType: string,
  refType?: FileRefType,
): ValidationResult {
  if (refType === 'CARD_AUDIO') {
    if (
      !(FILE_LIMITS.ALLOWED_MIME_TYPES.audio as readonly string[]).includes(
        mimeType,
      )
    ) {
      return {
        valid: false,
        error: `Audio files must be one of: ${FILE_LIMITS.ALLOWED_MIME_TYPES.audio.join(', ')}`,
      };
    }
    return { valid: true };
  }

  if (
    refType === 'AVATAR' ||
    refType === 'CARD_IMAGE' ||
    refType === 'DECK_COVER'
  ) {
    if (
      !(FILE_LIMITS.ALLOWED_MIME_TYPES.image as readonly string[]).includes(
        mimeType,
      )
    ) {
      return {
        valid: false,
        error: `Image files must be one of: ${FILE_LIMITS.ALLOWED_MIME_TYPES.image.join(', ')}`,
      };
    }
    return { valid: true };
  }

  // Generic check
  if (!ALL_ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size against limits based on refType.
 */
export function validateFileSize(
  sizeBytes: number,
  mimeType: string,
): ValidationResult {
  const isAudio = (
    FILE_LIMITS.ALLOWED_MIME_TYPES.audio as readonly string[]
  ).includes(mimeType);
  const maxSize = isAudio
    ? FILE_LIMITS.MAX_AUDIO_SIZE_BYTES
    : FILE_LIMITS.MAX_IMAGE_SIZE_BYTES;

  if (sizeBytes > maxSize) {
    const type = isAudio ? 'Audio' : 'Image';
    const maxMB = isAudio
      ? FILE_LIMITS.MAX_AUDIO_SIZE_BYTES / (1024 * 1024)
      : FILE_LIMITS.MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `${type} file size exceeds maximum of ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Determine resource type from MIME type.
 */
export function getResourceType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
}
