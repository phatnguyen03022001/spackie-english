// src/modules/file-manager/use-cases/delete-file.use-case.ts

import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { StorageService } from '@infrastructure/storage/storage.service';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { FILE_ERROR_CODES } from '@modules/file-manager/constants/file-limits.const';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

@Injectable()
export class DeleteFileUseCase {
  constructor(
    private readonly storageService: StorageService,
    private readonly fileRepository: FileManagerRepository,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DeleteFileUseCase.name);
  }

  async execute(fileId: string, userId: string): Promise<void> {
    // 1. Find file metadata
    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        FILE_ERROR_CODES.FILE_NOT_FOUND,
        'File not found',
      );
    }

    // 2. Check ownership (already done by guard, but double-check)
    if (file.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        FILE_ERROR_CODES.FILE_FORBIDDEN,
        'You do not have permission to delete this file',
      );
    }

    // 3. Check if file is referenced by any entity
    if (file.refId) {
      const refCount = await this.fileRepository.countByRefId(file.refId);
      if (refCount > 0) {
        throw new BusinessException(
          HttpStatus.CONFLICT,
          FILE_ERROR_CODES.FILE_IN_USE,
          'File is currently in use and cannot be deleted',
        );
      }
    }

    // 4. Delete from storage provider
    try {
      await this.storageService.delete(file.publicId);
    } catch (error: unknown) {
      this.logger.error(
        `Storage delete failed for file ${fileId}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Continue with metadata deletion even if storage fails
    }

    // 5. Delete metadata
    await this.fileRepository.delete(fileId);

    // 6. Invalidate quota cache
    await this.cacheManager.del(`file:quota:${userId}`);

    this.logger.log(`File deleted: ${fileId}`);
  }
}
