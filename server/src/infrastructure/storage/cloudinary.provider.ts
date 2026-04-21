import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import type {
  StorageProvider,
  UploadOptions,
  UploadResult,
} from './storage.provider';
import type { LoggerService } from '@common/logger/logger.service';
import { AppException } from '@common/filters/app-exception';
import { HttpStatus, Logger } from '@nestjs/common';
import { CircuitBreaker } from '../common/circuit-breaker';

/**
 * Adapter to make LoggerService compatible with the Logger interface
 * expected by CircuitBreaker. Extends NestJS Logger and delegates
 * all calls to the underlying LoggerService.
 */
class LoggerServiceBridge extends Logger {
  constructor(private readonly loggerService: LoggerService) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(message: any, ..._optionalParams: any[]) {
    this.loggerService.log(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(message: any, ..._optionalParams: any[]) {
    this.loggerService.error(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(message: any, ..._optionalParams: any[]) {
    this.loggerService.warn(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(message: any, ..._optionalParams: any[]) {
    this.loggerService.debug(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verbose(message: any, ..._optionalParams: any[]) {
    this.loggerService.verbose(message);
  }
}

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

    const loggerBridge = new LoggerServiceBridge(this.logger);
    this.uploadBreaker = new CircuitBreaker('CloudinaryUpload', loggerBridge);
    this.deleteBreaker = new CircuitBreaker('CloudinaryDelete', loggerBridge);
  }

  async upload(
    file: Buffer,
    originalName: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    return this.uploadBreaker.call(async () => {
      const uploadOptions: UploadApiOptions = {
        folder: options?.folder,
        public_id: options?.publicId,
        overwrite: options?.overwrite ?? true,
        resource_type: 'auto',
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
        throw new AppException(
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
        throw new AppException(
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
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'STORAGE_PING_FAILED',
        'Cannot reach Cloudinary API',
      );
    }
  }

  getSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = cloudinary.url(publicId, {
        secure: true,
        sign_url: true,
        expiry: Math.floor(Date.now() / 1000) + expiresIn,
      });
      return Promise.resolve(url);
    } catch (error) {
      this.logger.error({ error, publicId }, 'Cloudinary sign URL failed');
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'STORAGE_SIGN_FAILED',
        'Failed to generate signed URL',
      );
    }
  }
}
