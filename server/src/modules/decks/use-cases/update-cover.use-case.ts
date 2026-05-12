// src/modules/decks/use-cases/update-cover.use-case.ts
import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { DecksRepository } from '@modules/decks/decks.repository';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { CacheKeyBuilder } from '@common/utils/cache.util';
import { StorageService } from '@infrastructure/storage/storage.service';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';

@Injectable()
export class UpdateCoverUseCase {
  private readonly logger = new Logger(UpdateCoverUseCase.name);

  constructor(
    private readonly repository: DecksRepository,
    private readonly mapper: DeckMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly storageService: StorageService,
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
    private readonly fileManagerRepository: FileManagerRepository,
  ) {}

  async execute(
    userId: string,
    deckId: string,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<DeckResponseDto> {
    const deck = await this.repository.findById(deckId);
    if (!deck || deck.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'DECK_NOT_OWNED',
        'You do not own this deck',
      );
    }

    // Find existing cover file to delete later
    const existingFiles = await this.fileManagerRepository.findByUserId(userId);
    const existingCover = existingFiles.find(
      (f) => f.refType === 'DECK_COVER' && f.refId === deckId,
    );

    // Upload via FileManager to create metadata record
    const multerFile = {
      buffer: fileBuffer,
      originalname: originalName,
      mimetype: 'image/jpeg',
      size: fileBuffer.length,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: originalName,
      path: '',
      stream: null as unknown as NodeJS.ReadableStream,
    } as Express.Multer.File;

    const uploadedFile = await this.uploadFileUseCase.execute(
      userId,
      multerFile,
      'DECK_COVER',
      deckId,
    );

    // Delete old cover file if exists (directly via repository to bypass refCount check)
    if (existingCover) {
      try {
        await this.storageService.delete(existingCover.publicId);
        await this.fileManagerRepository.delete(existingCover.id);
        await this.cacheManager.del(`file:quota:${userId}`);
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to delete old cover: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Update deck's coverUrl
    const updated = await this.repository.update(deckId, {
      coverUrl: uploadedFile.url,
    });

    // Invalidate cache
    await this.cacheManager.del(
      CacheKeyBuilder.resource('decks', 'deck', deckId),
    );

    return this.mapper.toResponseDto(updated);
  }
}
