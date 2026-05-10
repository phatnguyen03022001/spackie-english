// src/modules/file-manager/file-manager.service.ts

import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { FileRefType } from '@prisma/client';
import { StorageService } from '@infrastructure/storage/storage.service';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { FileMapper } from '@modules/file-manager/mappers/file.mapper';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';
import { FILE_ERROR_CODES } from '@modules/file-manager/constants/file-limits.const';
import {
  validateMimeType,
  validateFileSize,
  getResourceType,
} from '@modules/file-manager/utils/file-validator.util';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

@Injectable()
export class FileManagerService {
  constructor(
    private readonly storageService: StorageService,
    private readonly fileRepository: FileManagerRepository,
    private readonly fileMapper: FileMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(FileManagerService.name);
  }

  async findById(fileId: string): Promise<FileResponseDto> {
    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        FILE_ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
      );
    }
    return this.fileMapper.toResponseDto(file);
  }

  async findByUserId(userId: string): Promise<FileResponseDto[]> {
    const files = await this.fileRepository.findByUserId(userId);
    return files.map((f) => this.fileMapper.toResponseDto(f));
  }

  async getSignedUrl(
    fileId: string,
    userId: string,
    expiresIn?: number,
  ): Promise<string> {
    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        FILE_ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
      );
    }

    if (file.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        FILE_ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to access this file',
      );
    }

    try {
      return await this.storageService.getSignedUrl(file.publicId, expiresIn);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get signed URL for file ${fileId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        FILE_ERROR_CODES.FILE_UPLOAD_FAILED,
        'Failed to generate signed URL',
      );
    }
  }

  /**
   * Upload file from a remote URL (for CardsModule auto-enrich).
   */
  async uploadFromUrl(
    url: string,
    options: {
      ownerUserId: string;
      type: FileRefType;
      entityId?: string;
      folder?: string;
    },
  ): Promise<FileResponseDto> {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(15000), // 15s timeout
      });
    } catch {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        FILE_ERROR_CODES.FILE_UPLOAD_FAILED,
        'Failed to fetch file from URL',
      );
    }

    if (!response.ok) {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        FILE_ERROR_CODES.FILE_UPLOAD_FAILED,
        `Remote server returned ${response.status}`,
      );
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = parseInt(
      response.headers.get('content-length') || '0',
      10,
    );

    // Validate MIME type
    const mimeValidation = validateMimeType(contentType, options.type);
    if (!mimeValidation.valid) {
      throw new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        FILE_ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
        mimeValidation.error!,
      );
    }

    // Validate size
    if (contentLength > 0) {
      const sizeValidation = validateFileSize(contentLength, contentType);
      if (!sizeValidation.valid) {
        throw new BusinessException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          FILE_ERROR_CODES.FILE_TOO_LARGE,
          sizeValidation.error!,
        );
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Upload to storage
    const folder = options.folder || 'uploads';
    const uploadResult = await this.storageService.upload(
      buffer,
      `from-url-${Date.now()}`,
      {
        folder,
      },
    );

    // Save metadata
    const fileRecord = await this.fileRepository.create({
      user: { connect: { id: options.ownerUserId } },
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: getResourceType(contentType),
      mimeType: contentType,
      sizeBytes: buffer.length,
      refType: options.type,
      refId: options.entityId ?? null,
      meta: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        sourceUrl: url,
      },
    });

    return this.fileMapper.toResponseDto(fileRecord);
  }
}
