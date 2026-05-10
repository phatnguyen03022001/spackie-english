// src/modules/decks/use-cases/update-cover.use-case.ts
import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { DecksRepository } from '@modules/decks/decks.repository';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { CacheKeyBuilder } from '@common/utils/cache.util';
import { StorageService } from '@infrastructure/storage/storage.service';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class UpdateCoverUseCase {
  private readonly logger = new Logger(UpdateCoverUseCase.name);

  constructor(
    private readonly repository: DecksRepository,
    private readonly mapper: DeckMapper,
    private readonly storageService: StorageService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly prisma: PrismaService,
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

    // Upload new cover image with consistent publicId
    const timestamp = Date.now();
    const publicId = `decks/covers/${deckId}_${timestamp}`;
    const uploadResult = await this.storageService.upload(
      fileBuffer,
      originalName,
      { folder: 'decks/covers', publicId },
    );

    // Delete old cover if exists
    if (deck.coverUrl) {
      const oldPublicId = this.extractPublicIdFromUrl(deck.coverUrl);
      if (oldPublicId) {
        await this.storageService.delete(oldPublicId).catch((err: unknown) => {
          // Log warning but don't fail the operation
          this.logger.warn(
            `Failed to delete old cover: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }
    }

    const updated = await this.repository.update(deckId, {
      coverUrl: uploadResult.url,
    });

    // Create File record for ownership tracking and quota
    await this.prisma.file
      .create({
        data: {
          userId,
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          resourceType: 'image',
          mimeType: 'image/jpeg', // default, actual type from buffer if needed
          sizeBytes: fileBuffer.length,
          refType: 'DECK_COVER',
          refId: deckId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to create File record for deck cover: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    // Invalidate cache
    await this.cacheManager.del(
      CacheKeyBuilder.resource('decks', 'deck', deckId),
    );

    return this.mapper.toResponseDto(updated);
  }

  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/v\d+\/(.+)\.[a-z]+$/);
    return match ? match[1] : null;
  }
}
