// src/modules/favorite/favorite.module.ts
import { Module } from '@nestjs/common';
import { FavoriteController } from '@modules/favorite/favorite.controller';
import { FavoriteService } from '@modules/favorite/favorite.service';
import { FavoriteRepository } from '@modules/favorite/favorite.repository';

@Module({
  controllers: [FavoriteController],
  providers: [FavoriteService, FavoriteRepository],
  exports: [FavoriteService],
})
export class FavoriteModule {}
