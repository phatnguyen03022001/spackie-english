export interface UploadOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
}

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
}

export interface StorageProvider {
  upload(
    file: Buffer,
    originalName: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
  ping(): Promise<void>;
  getSignedUrl(publicId: string, expiresIn?: number): Promise<string>;
}
