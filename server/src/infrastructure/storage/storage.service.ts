import { Injectable, Inject } from '@nestjs/common';
import {
  StorageProvider,
  UploadOptions,
  UploadResult,
} from './storage.provider';

@Injectable()
export class StorageService {
  constructor(
    @Inject('STORAGE_PROVIDER') private readonly provider: StorageProvider,
  ) {}

  async upload(
    file: Buffer,
    originalName: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    return this.provider.upload(file, originalName, options);
  }

  async delete(publicId: string): Promise<void> {
    return this.provider.delete(publicId);
  }

  async ping(): Promise<void> {
    return this.provider.ping();
  }

  async getSignedUrl(publicId: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUrl(publicId, expiresIn);
  }
}
