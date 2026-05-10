// src/modules/decks/decks.module.ts
import { Module } from '@nestjs/common';
import { DecksController } from '@modules/decks/decks.controller';
import { DecksService } from '@modules/decks/decks.service';
import { DecksRepository } from '@modules/decks/decks.repository';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { UpdateCoverUseCase } from '@modules/decks/use-cases/update-cover.use-case';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { PrismaModule } from '@database/prisma.module';

@Module({
  imports: [RedisModule, StorageModule, PrismaModule],
  controllers: [DecksController],
  providers: [DecksService, DecksRepository, DeckMapper, UpdateCoverUseCase],
  exports: [DecksService, DecksRepository],
})
export class DecksModule {}
