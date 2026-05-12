// src/modules/file-manager/file-manager.module.ts

import { Module } from '@nestjs/common';
import { FileManagerController } from '@modules/file-manager/file-manager.controller';
import { FileManagerService } from '@modules/file-manager/file-manager.service';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { FileMapper } from '@modules/file-manager/mappers/file.mapper';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileOwnershipGuard } from '@modules/file-manager/guards/file-ownership.guard';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [FileManagerController],
  providers: [
    FileManagerService,
    FileManagerRepository,
    FileMapper,
    UploadFileUseCase,
    DeleteFileUseCase,
    FileOwnershipGuard,
  ],
  exports: [
    FileManagerService,
    UploadFileUseCase,
    DeleteFileUseCase,
    FileMapper,
    FileManagerRepository,
  ],
})
export class FileManagerModule {}
