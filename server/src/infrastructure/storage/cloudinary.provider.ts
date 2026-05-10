import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import type {
  StorageProvider,
  UploadOptions,
  UploadResult,
} from '@infrastructure/storage/storage.provider';
import type { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@/common/filters/business.exception';
import { HttpStatus } from '@nestjs/common';
import { CircuitBreaker } from '@infrastructure/common/circuit-breaker';

export class CloudinaryProvider implements StorageProvider {
  private uploadBreaker: CircuitBreaker;
  private deleteBreaker: CircuitBreaker;

  constructor(
    private readonly config: {
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    },
    private readonly logger: LoggerService,
  ) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      timeout: 60000,
    });
    this.logger.setContext(CloudinaryProvider.name);
    this.uploadBreaker = new CircuitBreaker('CloudinaryUpload', this.logger);
    this.deleteBreaker = new CircuitBreaker('CloudinaryDelete', this.logger);
  }

  async upload(
    file: Buffer,
    originalName: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    return this.uploadBreaker.call(async () => {
      // Determine resource type and transformations based on file type
      const isAudio = originalName.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
      const isImage = originalName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

      const transformations: Array<Record<string, unknown>> = [];

      if (isImage) {
        // Image optimization: auto quality, auto format, max width 800px
        transformations.push(
          { quality: 'auto', fetch_format: 'auto' },
          { width: 800, crop: 'limit' },
        );
      } else if (isAudio) {
        // Audio optimization: bitrate 128k, mp3 format
        transformations.push({ bitrate: '128k', format: 'mp3' });
      }

      const uploadOptions: UploadApiOptions = {
        folder: options?.folder,
        public_id: options?.publicId,
        overwrite: options?.overwrite ?? true,
        resource_type: isAudio ? 'video' : 'auto', // Cloudinary treats audio as video
        transformation:
          transformations.length > 0 ? transformations : undefined,
      };
      try {
        const result: UploadApiResponse = await new Promise(
          (resolve, reject) => {
            cloudinary.uploader
              .upload_stream(uploadOptions, (error, uploadResult) => {
                if (error) reject(new Error(error.message));
                else resolve(uploadResult!);
              })
              .end(file);
          },
        );
        return {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
        };
      } catch (error) {
        this.logger.error({ error, originalName }, 'Cloudinary upload failed');
        throw new BusinessException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'STORAGE_UPLOAD_FAILED',
          'Failed to upload file to Cloudinary',
        );
      }
    });
  }

  async delete(publicId: string): Promise<void> {
    return this.deleteBreaker.call(async () => {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        this.logger.error({ error, publicId }, 'Cloudinary delete failed');
        throw new BusinessException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'STORAGE_DELETE_FAILED',
          'Failed to delete file from Cloudinary',
        );
      }
    });
  }

  async ping(): Promise<void> {
    try {
      await cloudinary.api.ping();
    } catch (error) {
      this.logger.error({ error }, 'Cloudinary ping failed');
      throw new BusinessException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'STORAGE_PING_FAILED',
        'Cannot reach Cloudinary API',
      );
    }
  }

  getSignedUrl(publicId: string, expiresIn = 3600): Promise<string> {
    try {
      const url = cloudinary.url(publicId, {
        secure: true,
        sign_url: true,
        expiry: Math.floor(Date.now() / 1000) + expiresIn,
      });
      return Promise.resolve(url);
    } catch (error) {
      this.logger.error({ error, publicId }, 'Cloudinary sign URL failed');
      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'STORAGE_SIGN_FAILED',
        'Failed to generate signed URL',
      );
    }
  }
}
