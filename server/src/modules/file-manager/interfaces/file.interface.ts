// src/modules/file-manager/interfaces/file.interface.ts

import type { FileRefType } from '@prisma/client';

export interface UploadOptions {
  ownerUserId: string;
  type: FileRefType;
  entityId?: string;
  folder?: string;
  publicId?: string;
}

export interface UploadFromUrlOptions {
  ownerUserId: string;
  url: string;
  type: FileRefType;
  entityId?: string;
  folder?: string;
}

export interface FileMetadata {
  id: string;
  userId: string;
  url: string;
  publicId: string;
  resourceType: string;
  mimeType: string;
  sizeBytes: number;
  refType: FileRefType | null;
  refId: string | null;
  meta: Record<string, unknown>;
  createdAt: Date;
}

export interface QuotaInfo {
  usedBytes: number;
  maxBytes: number;
  remainingBytes: number;
}
