// src/modules/file-manager/use-cases/upload-file.use-case.ts

import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { FileRefType } from '@prisma/client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { FileMapper } from '@modules/file-manager/mappers/file.mapper';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';
import {
  FILE_LIMITS,
  FILE_ERROR_CODES,
} from '@modules/file-manager/constants/file-limits.const';
import {
  validateMimeType,
  validateFileSize,
  getResourceType,
} from '@modules/file-manager/utils/file-validator.util';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

@Injectable()
export class UploadFileUseCase {
  private readonly CACHE_TTL = 60; // 60s for quota cache

  constructor(
    private readonly storageService: StorageService,
    private readonly fileRepository: FileManagerRepository,
    private readonly fileMapper: FileMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(UploadFileUseCase.name);
  }

  async execute(
    userId: string,
    file: Express.Multer.File,
    refType?: FileRefType,
    refId?: string,
  ): Promise<FileResponseDto> {
    // 1. Validate MIME type
    const mimeValidation = validateMimeType(file.mimetype, refType);
    if (!mimeValidation.valid) {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        FILE_ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
        mimeValidation.error!,
      );
    }

    // 2. Validate file size
    const sizeValidation = validateFileSize(file.size, file.mimetype);
    if (!sizeValidation.valid) {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        FILE_ERROR_CODES.FILE_TOO_LARGE,
        sizeValidation.error!,
      );
    }

    // 3. Check quota
    await this.checkQuota(userId, file.size);

    // 4. Upload to storage provider
    const folder = this.resolveFolder(refType);
    let uploadResult: {
      url: string;
      publicId: string;
      format: string;
      size: number;
      width?: number;
      height?: number;
    };
    try {
      uploadResult = await this.storageService.upload(
        file.buffer,
        file.originalname,
        {
          folder,
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        `Storage upload failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        FILE_ERROR_CODES.FILE_UPLOAD_FAILED,
        'Failed to upload file to storage',
      );
    }

    // 5. Save metadata
    const fileRecord = await this.fileRepository.create({
      user: { connect: { id: userId } },
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: getResourceType(file.mimetype),
      mimeType: file.mimetype,
      sizeBytes: file.size,
      refType: refType ?? null,
      refId: refId ?? null,
      meta: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        originalName: file.originalname,
      },
    });

    // 6. Invalidate quota cache
    await this.invalidateQuotaCache(userId);

    this.logger.log(`File uploaded: ${fileRecord.id} for user ${userId}`);

    return this.fileMapper.toResponseDto(fileRecord);
  }

  private async checkQuota(userId: string, newFileSize: number): Promise<void> {
    const cacheKey = `file:quota:${userId}`;
    let usedBytes = await this.cacheManager.get<number>(cacheKey);

    if (usedBytes === null) {
      usedBytes = await this.fileRepository.getTotalSizeByUserId(userId);
      await this.cacheManager.set(cacheKey, usedBytes, this.CACHE_TTL);
    }

    const newTotal = usedBytes + newFileSize;
    if (newTotal > FILE_LIMITS.MAX_USER_QUOTA_BYTES) {
      throw new BusinessException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        FILE_ERROR_CODES.FILE_QUOTA_EXCEEDED,
        `Storage quota exceeded. Maximum: ${FILE_LIMITS.MAX_USER_QUOTA_BYTES / (1024 * 1024)}MB`,
      );
    }
  }

  private async invalidateQuotaCache(userId: string): Promise<void> {
    await this.cacheManager.del(`file:quota:${userId}`);
  }

  private resolveFolder(refType?: FileRefType): string {
    switch (refType) {
      case 'AVATAR':
        return 'avatars';
      case 'CARD_IMAGE':
        return 'cards/images';
      case 'CARD_AUDIO':
        return 'cards/audio';
      case 'DECK_COVER':
        return 'decks/covers';
      default:
        return 'uploads';
    }
  }
}
